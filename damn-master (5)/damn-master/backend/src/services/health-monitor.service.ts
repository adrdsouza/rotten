import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Logger, TransactionalConnection } from '@vendure/core';
import { RedisConnectionPool } from '../utils/redis-connection-pool.js';
import * as os from 'os';
import * as v8 from 'v8';

/**
 * Comprehensive health monitoring service
 * Tracks database, Redis, memory, and system health
 * Logs critical issues that could cause 502 errors
 */
@Injectable()
export class HealthMonitorService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly loggerCtx = 'HealthMonitor';
    private monitoringInterval: NodeJS.Timeout | null = null;
    private readonly MONITORING_INTERVAL = 120000; // 2 minutes (optimized for memory)
    private readonly CRITICAL_LOG_INTERVAL = 300000; // 5 minutes for critical issues

    private lastCriticalLog = 0;
    private healthStats = {
        timestamp: new Date(),
        database: { healthy: false, activeConnections: 0, maxConnections: 0, totalConnections: 0, responseTime: 0, error: '' },
        redis: { healthy: false, connections: 0, details: {} },
        memory: { heapUsed: 0, heapTotal: 0, heapLimit: 0, systemFree: 0, systemTotal: 0, heapUsagePercent: 0, heapLimitPercent: 0, systemUsagePercent: 0 },
        system: { loadAverage: 0, cpuCount: 0, uptime: 0, loadPercentage: 0 },
        process: { pid: process.pid, uptime: 0, restarts: 0 }
    };

    constructor(
        private connection: TransactionalConnection
    ) {}

    async onApplicationBootstrap() {
        Logger.info('🔍 Starting optimized health monitoring', this.loggerCtx);

        // Set up process monitoring
        this.setupProcessMonitoring();

        // Start periodic health checks with longer interval
        this.startMonitoring();

        // Log initial health status
        await this.performHealthCheck();
    }

    onApplicationShutdown() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            Logger.info('Health monitoring service stopped', this.loggerCtx);
        }
    }

    private setupProcessMonitoring(): void {
        // Monitor unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            Logger.error(
                `🚨 UNHANDLED PROMISE REJECTION: ${reason}\nPromise: ${promise}`,
                this.loggerCtx
            );
        });

        // Monitor uncaught exceptions
        process.on('uncaughtException', (error) => {
            Logger.error(
                `🚨 UNCAUGHT EXCEPTION: ${error.message}\nStack: ${error.stack}`,
                this.loggerCtx
            );
        });

        // Monitor memory warnings
        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning' || 
                warning.message.includes('memory')) {
                Logger.warn(
                    `⚠️ PROCESS WARNING: ${warning.name} - ${warning.message}`,
                    this.loggerCtx
                );
            }
        });
    }

    private startMonitoring(): void {
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();

                // Periodic garbage collection to prevent memory leaks
                if (global.gc && Math.random() < 0.1) { // 10% chance each check
                    global.gc();
                }
            } catch (error) {
                Logger.error(`Health check failed: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
            }
        }, this.MONITORING_INTERVAL);

        Logger.info(`Optimized health monitoring started with ${this.MONITORING_INTERVAL / 1000}s interval`, this.loggerCtx);
    }

    private async performHealthCheck(): Promise<void> {
        try {
            const timestamp = new Date();
            
            // Check database health
            const dbHealth = await this.checkDatabaseHealth();
            
            // Check Redis health
            const redisHealth = await this.checkRedisHealth();
            
            // Check memory health
            const memoryHealth = this.checkMemoryHealth();
            
            // Check system health
            const systemHealth = this.checkSystemHealth();
            
            // Update health stats
            this.healthStats = {
                timestamp,
                database: dbHealth,
                redis: redisHealth,
                memory: memoryHealth,
                system: systemHealth,
                process: {
                    pid: process.pid,
                    uptime: Math.round(process.uptime()),
                    restarts: this.getProcessRestarts()
                }
            };

            // Check for critical issues
            await this.checkForCriticalIssues();

            // Aggressive memory management based on actual heap limit
            if (this.healthStats.memory.heapLimitPercent > 80) {
                Logger.warn(`High memory usage detected: ${this.healthStats.memory.heapLimitPercent}% of ${this.healthStats.memory.heapLimit}MB limit - triggering cleanup`, this.loggerCtx);
                if (global.gc) {
                    global.gc();
                    Logger.info('Garbage collection triggered', this.loggerCtx);
                }
            }

        } catch (error) {
            Logger.error(`Error during health check: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
        }
    }

    private async checkDatabaseHealth(): Promise<any> {
        let queryRunner: any = null;
        try {
            queryRunner = this.connection.rawConnection.createQueryRunner();

            // Test basic connectivity
            const startTime = Date.now();
            await queryRunner.query('SELECT 1');
            const responseTime = Date.now() - startTime;

            // Get connection stats
            const connectionStats = await queryRunner.query(`
                SELECT
                    count(*) as total_connections,
                    count(*) FILTER (WHERE state = 'active') as active_connections,
                    count(*) FILTER (WHERE state = 'idle') as idle_connections
                FROM pg_stat_activity
                WHERE datname = current_database()
            `);

            // Get max connections separately
            const maxConnResult = await queryRunner.query(`
                SELECT setting::int as max_connections
                FROM pg_settings
                WHERE name = 'max_connections'
            `);

            const stats = connectionStats[0];
            const maxConn = maxConnResult[0];
            return {
                healthy: responseTime < 1000, // Healthy if response < 1 second
                activeConnections: parseInt(stats.active_connections, 10),
                idleConnections: parseInt(stats.idle_connections, 10),
                totalConnections: parseInt(stats.total_connections, 10),
                maxConnections: parseInt(maxConn.max_connections, 10),
                responseTime
            };
        } catch (error) {
            Logger.error(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`, this.loggerCtx);
            return {
                healthy: false,
                activeConnections: 0,
                idleConnections: 0,
                totalConnections: 0,
                maxConnections: 0,
                responseTime: -1,
                error: error instanceof Error ? error.message : String(error)
            };
        } finally {
            // Ensure query runner is always released
            if (queryRunner) {
                try {
                    await queryRunner.release();
                } catch (releaseError) {
                    Logger.warn(`Failed to release query runner: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`, this.loggerCtx);
                }
            }
        }
    }

    private async checkRedisHealth(): Promise<any> {
        try {
            const pool = RedisConnectionPool.getInstance();
            const healthCheck = await pool.healthCheck();
            
            return {
                healthy: healthCheck.healthy,
                connections: pool.getConnectionCount(),
                details: healthCheck.details
            };
        } catch (error) {
            return {
                healthy: false,
                connections: 0,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    private checkMemoryHealth(): any {
        const memUsage = process.memoryUsage();
        const systemMem = {
            free: os.freemem(),
            total: os.totalmem()
        };

        // Get V8 heap statistics for more accurate limits
        const v8Stats = v8.getHeapStatistics();
        const heapLimit = v8Stats.heap_size_limit;

        return {
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
            heapLimit: Math.round(heapLimit / 1024 / 1024), // MB - actual V8 limit
            external: Math.round(memUsage.external / 1024 / 1024), // MB
            systemFree: Math.round(systemMem.free / 1024 / 1024), // MB
            systemTotal: Math.round(systemMem.total / 1024 / 1024), // MB
            heapUsagePercent: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100), // % of current heap
            heapLimitPercent: Math.round((memUsage.heapUsed / heapLimit) * 100), // % of max possible heap
            systemUsagePercent: Math.round(((systemMem.total - systemMem.free) / systemMem.total) * 100)
        };
    }

    private checkSystemHealth(): any {
        const loadAvg = os.loadavg();
        const cpuCount = os.cpus().length;

        return {
            loadAverage: loadAvg[0], // 1-minute load average
            loadAverage5: loadAvg[1], // 5-minute load average
            loadAverage15: loadAvg[2], // 15-minute load average
            cpuCount,
            loadPercentage: Math.round((loadAvg[0] / cpuCount) * 100),
            uptime: Math.round(os.uptime() / 60) // minutes
        };
    }

    private getProcessRestarts(): number {
        // Try to read PM2 restart count from environment or file
        try {
            return parseInt(process.env.PM2_RESTART_COUNT || '0', 10);
        } catch {
            return 0;
        }
    }

    private async checkForCriticalIssues(): Promise<void> {
        const now = Date.now();
        const stats = this.healthStats;
        const criticalIssues: string[] = [];

        // Database connection exhaustion
        if (stats.database.totalConnections > stats.database.maxConnections * 0.9) {
            criticalIssues.push(
                `🚨 DB CONNECTION CRITICAL: ${stats.database.totalConnections}/${stats.database.maxConnections} (${Math.round((stats.database.totalConnections / stats.database.maxConnections) * 100)}%)`
            );
        }

        // Database response time
        if (stats.database.responseTime > 2000) {
            criticalIssues.push(
                `🚨 DB RESPONSE SLOW: ${stats.database.responseTime}ms (>2s)`
            );
        }

        // Memory exhaustion - use heap limit percentage for more accurate alerts
        if (stats.memory.heapLimitPercent > 85) {
            criticalIssues.push(
                `🚨 HEAP MEMORY CRITICAL: ${stats.memory.heapLimitPercent}% of limit (${stats.memory.heapUsed}MB/${stats.memory.heapLimit}MB max)`
            );
        }

        // System memory exhaustion
        if (stats.memory.systemUsagePercent > 95) {
            criticalIssues.push(
                `🚨 SYSTEM MEMORY CRITICAL: ${stats.memory.systemUsagePercent}% (${stats.memory.systemFree}MB free)`
            );
        }

        // High system load
        if (stats.system.loadPercentage > 150) {
            criticalIssues.push(
                `🚨 HIGH SYSTEM LOAD: ${stats.system.loadAverage.toFixed(2)} (${stats.system.loadPercentage}% of ${stats.system.cpuCount} CPUs)`
            );
        }

        // Redis connection issues
        if (!stats.redis.healthy) {
            criticalIssues.push(
                `🚨 REDIS CONNECTION FAILED: ${JSON.stringify(stats.redis.details)}`
            );
        }

        // Database connection failure
        if (!stats.database.healthy) {
            criticalIssues.push(
                `🚨 DATABASE CONNECTION FAILED: ${stats.database.error || 'Unknown error'}`
            );
        }

        // Log critical issues
        if (criticalIssues.length > 0) {
            if (now - this.lastCriticalLog > this.CRITICAL_LOG_INTERVAL) {
                Logger.error(
                    `🚨 CRITICAL HEALTH ISSUES DETECTED:\n${criticalIssues.join('\n')}`,
                    this.loggerCtx
                );
                this.lastCriticalLog = now;
            }
        } else {
            // Log healthy status periodically
            if (now - this.lastCriticalLog > this.CRITICAL_LOG_INTERVAL * 5) { // Every 5 minutes when healthy
                Logger.info(
                    `✅ SYSTEM HEALTHY - DB: ${stats.database.totalConnections}/${stats.database.maxConnections} conn, ` +
                    `Heap: ${stats.memory.heapLimitPercent}% of ${stats.memory.heapLimit}MB limit, Load: ${stats.system.loadPercentage}%`,
                    this.loggerCtx
                );
                this.lastCriticalLog = now;
            }
        }
    }

    /**
     * Get current health status (for API endpoints)
     */
    getHealthStatus() {
        return {
            ...this.healthStats,
            status: this.healthStats.database.healthy && this.healthStats.redis.healthy ? 'healthy' : 'unhealthy'
        };
    }

    /**
     * Force a health check (useful for debugging)
     */
    async forceHealthCheck(): Promise<any> {
        await this.performHealthCheck();
        return this.getHealthStatus();
    }
}
