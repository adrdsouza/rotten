import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Logger, TransactionalConnection } from '@vendure/core';
import { getRedisHealthStatus } from '../utils/redis-connection-pool';
import * as os from 'os';

/**
 * Service to monitor database and Redis connection health
 * Provides real-time visibility into connection pool status
 */
@Injectable()
export class ConnectionMonitorService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly loggerCtx = 'ConnectionMonitor';
    private monitoringInterval: NodeJS.Timeout | null = null;
    private readonly MONITORING_INTERVAL = 30000; // 30 seconds
    private readonly LOG_INTERVAL = 300000; // 5 minutes for detailed logs

    private lastDetailedLog = 0;
    private connectionStats = {
        dbConnectionsUsed: 0,
        dbConnectionsIdle: 0,
        dbConnectionsTotal: 0,
        redisConnectionsHealthy: 0,
        redisConnectionsTotal: 0,
        memoryUsage: 0,
        cpuUsage: 0
    };

    constructor(
        private connection: TransactionalConnection
    ) {}

    async onApplicationBootstrap() {
        Logger.info('Starting connection monitoring service', this.loggerCtx);
        this.startMonitoring();
    }

    onApplicationShutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            Logger.info('Connection monitoring service stopped', this.loggerCtx);
        }
    }

    private startMonitoring(): void {
        this.monitoringInterval = setInterval(async () => {
            await this.checkConnectionHealth();
        }, this.MONITORING_INTERVAL);
    }

    private async checkConnectionHealth(): Promise<void> {
        try {
            // Get database connection pool stats
            const dbStats = await this.getDatabaseStats();
            
            // Get Redis connection health
            const redisStats = await this.getRedisStats();
            
            // Get system stats
            const systemStats = this.getSystemStats();

            // Update internal stats
            this.connectionStats = {
                ...dbStats,
                ...redisStats,
                ...systemStats
            };

            // Check for critical issues
            await this.checkForCriticalIssues();

            // Log detailed stats every 5 minutes
            const now = Date.now();
            if (now - this.lastDetailedLog > this.LOG_INTERVAL) {
                this.logDetailedStats();
                this.lastDetailedLog = now;
            }

        } catch (error) {
            Logger.error(`Error during connection health check: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
        }
    }

    private async getDatabaseStats(): Promise<any> {
        try {
            // Get TypeORM connection pool stats
            const queryRunner = this.connection.rawConnection.createQueryRunner();
            
            // Query PostgreSQL for connection stats
            const result = await queryRunner.query(`
                SELECT 
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections,
                    max_conn.setting::int as max_connections
                FROM pg_stat_activity 
                CROSS JOIN (SELECT setting FROM pg_settings WHERE name = 'max_connections') max_conn
                WHERE datname = current_database()
            `);

            await queryRunner.release();

            const stats = result[0];
            return {
                dbConnectionsUsed: parseInt(stats.active_connections, 10),
                dbConnectionsIdle: parseInt(stats.idle_connections, 10),
                dbConnectionsTotal: parseInt(stats.total_connections, 10),
                dbMaxConnections: parseInt(stats.max_connections, 10)
            };
        } catch (error) {
            Logger.error(`Error getting database stats: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
            return {
                dbConnectionsUsed: 0,
                dbConnectionsIdle: 0,
                dbConnectionsTotal: 0,
                dbMaxConnections: 100
            };
        }
    }

    private async getRedisStats(): Promise<any> {
        try {
            const redisHealth = await getRedisHealthStatus();
            const healthyCount = Object.values(redisHealth.details).filter(Boolean).length;
            const totalCount = Object.keys(redisHealth.details).length;

            return {
                redisConnectionsHealthy: healthyCount,
                redisConnectionsTotal: totalCount,
                redisOverallHealthy: redisHealth.healthy
            };
        } catch (error) {
            Logger.error(`Error getting Redis stats: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
            return {
                redisConnectionsHealthy: 0,
                redisConnectionsTotal: 0,
                redisOverallHealthy: false
            };
        }
    }

    private getSystemStats(): any {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            memoryUsage: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            memoryExternal: Math.round(memUsage.external / 1024 / 1024), // MB
            cpuUser: cpuUsage.user,
            cpuSystem: cpuUsage.system,
            loadAverage: os.loadavg()[0], // 1-minute load average
            freeMemory: Math.round(os.freemem() / 1024 / 1024), // MB
            totalMemory: Math.round(os.totalmem() / 1024 / 1024) // MB
        };
    }

    private async checkForCriticalIssues(): Promise<void> {
        const stats = this.connectionStats;

        // Check database connection usage
        const dbUsagePercent = (stats.dbConnectionsTotal / (stats as any).dbMaxConnections) * 100;
        if (dbUsagePercent > 80) {
            Logger.warn(
                `🚨 HIGH DB CONNECTION USAGE: ${stats.dbConnectionsTotal}/${(stats as any).dbMaxConnections} (${dbUsagePercent.toFixed(1)}%)`,
                this.loggerCtx
            );
        }

        // Check Redis health
        if (!(stats as any).redisOverallHealthy) {
            Logger.error(
                `🚨 REDIS CONNECTION ISSUES: ${stats.redisConnectionsHealthy}/${stats.redisConnectionsTotal} healthy`,
                this.loggerCtx
            );
        }

        // Check memory usage
        const memUsagePercent = (stats.memoryUsage / (stats as any).memoryTotal) * 100;
        if (memUsagePercent > 85) {
            Logger.warn(
                `🚨 HIGH MEMORY USAGE: ${stats.memoryUsage}MB/${(stats as any).memoryTotal}MB (${memUsagePercent.toFixed(1)}%)`,
                this.loggerCtx
            );
        }

        // Check system load
        const loadAverage = (stats as any).loadAverage;
        const cpuCount = os.cpus().length;
        if (loadAverage > cpuCount * 0.8) {
            Logger.warn(
                `🚨 HIGH SYSTEM LOAD: ${loadAverage.toFixed(2)} (${cpuCount} CPUs)`,
                this.loggerCtx
            );
        }
    }

    private logDetailedStats(): void {
        const stats = this.connectionStats;
        const systemStats = stats as any;

        Logger.info(
            `📊 CONNECTION HEALTH REPORT:\n` +
            `  🗄️  Database: ${stats.dbConnectionsUsed} active, ${stats.dbConnectionsIdle} idle, ${stats.dbConnectionsTotal}/${systemStats.dbMaxConnections} total\n` +
            `  🔴 Redis: ${stats.redisConnectionsHealthy}/${stats.redisConnectionsTotal} healthy\n` +
            `  🧠 Memory: ${stats.memoryUsage}MB/${systemStats.memoryTotal}MB heap, ${systemStats.freeMemory}MB/${systemStats.totalMemory}MB system\n` +
            `  ⚡ Load: ${systemStats.loadAverage.toFixed(2)} (${os.cpus().length} CPUs)\n` +
            `  🔄 Uptime: ${Math.round(process.uptime() / 60)} minutes`,
            this.loggerCtx
        );
    }

    /**
     * Get current connection statistics (for API endpoints or admin monitoring)
     */
    getConnectionStats() {
        return {
            ...this.connectionStats,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }

    /**
     * Force a health check (useful for debugging)
     */
    async forceHealthCheck(): Promise<any> {
        await this.checkConnectionHealth();
        return this.getConnectionStats();
    }
}
