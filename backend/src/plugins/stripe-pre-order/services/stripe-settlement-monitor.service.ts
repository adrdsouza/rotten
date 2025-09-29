import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { StripeSettlementMetricsService } from './stripe-settlement-metrics.service';
import { StripeSettlementAlertingService } from './stripe-settlement-alerting.service';
import { StripeSettlementLoggerService } from './stripe-settlement-logger.service';

/**
 * Background monitoring service for Stripe payment settlement
 * Runs periodic health checks and triggers alerts when needed
 */
@Injectable()
export class StripeSettlementMonitorService implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly logger = new Logger('StripeSettlementMonitor');
    private isRunning = false;
    private monitoringEnabled = true;

    constructor(
        private metricsService: StripeSettlementMetricsService,
        private alertingService: StripeSettlementAlertingService,
        private loggerService: StripeSettlementLoggerService
    ) {}

    async onApplicationBootstrap() {
        this.logger.log('Stripe Settlement Monitor service started');
        
        // Log initial system status
        await this.logSystemStatus();
    }

    onApplicationShutdown() {
        this.logger.log('Stripe Settlement Monitor service stopped');
    }

    /**
     * Run health checks every 2 minutes
     * Monitors metrics and triggers alerts for critical issues
     */
    @Cron('0 */2 * * * *') // Every 2 minutes
    async performHealthCheck(): Promise<void> {
        if (!this.monitoringEnabled || this.isRunning) {
            return;
        }

        this.isRunning = true;
        
        try {
            this.logger.debug('Performing Stripe settlement health check');
            
            // Check metrics and send alerts if needed
            await this.alertingService.checkAndSendAlerts();
            
            // Log current metrics summary (debug level to avoid spam)
            const metrics = this.metricsService.getMetricsSummary();
            this.logger.debug(`Health check complete - Success rate: ${(metrics.settlementStats.successRate * 100).toFixed(1)}%, Consecutive failures: ${metrics.settlementStats.consecutiveFailures}`);
            
        } catch (error) {
            this.logger.error(`Health check failed: ${error}`, 'StripeSettlementMonitor');
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Generate and log daily summary report
     * Runs at 1 AM every day
     */
    @Cron('0 0 1 * * *') // Daily at 1 AM
    async generateDailyReport(): Promise<void> {
        if (!this.monitoringEnabled) {
            return;
        }

        try {
            this.logger.log('Generating daily Stripe settlement report');
            
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            // Get daily stats
            const dailyStats = this.metricsService.getDailyStats(yesterdayStr);
            const dbStats = await this.metricsService.getDatabaseStats();
            const healthReport = await this.metricsService.generateHealthReport();
            
            // Log comprehensive daily report
            this.logger.log(`[DAILY_REPORT] ${yesterdayStr} Settlement Summary:`);
            
            if (dailyStats) {
                this.logger.log(`  - Attempts: ${dailyStats.attempts}`);
                this.logger.log(`  - Successes: ${dailyStats.successes}`);
                this.logger.log(`  - Failures: ${dailyStats.failures}`);
                this.logger.log(`  - Success Rate: ${(dailyStats.successRate * 100).toFixed(2)}%`);
                this.logger.log(`  - Average Time: ${dailyStats.averageTimeMs.toFixed(0)}ms`);
            } else {
                this.logger.log(`  - No settlement activity recorded for ${yesterdayStr}`);
            }
            
            this.logger.log(`[DAILY_REPORT] Current System Status:`);
            this.logger.log(`  - Health Status: ${healthReport.status.toUpperCase()}`);
            this.logger.log(`  - Pending Payments: ${dbStats.totalPendingPayments}`);
            this.logger.log(`  - Payments Last 24h: ${dbStats.paymentsLast24Hours}`);
            
            if (dbStats.oldestPendingPayment) {
                const ageHours = (Date.now() - new Date(dbStats.oldestPendingPayment).getTime()) / (1000 * 60 * 60);
                this.logger.log(`  - Oldest Pending: ${ageHours.toFixed(1)} hours old`);
            }
            
            // Log recommendations if any
            if (healthReport.recommendations.length > 0) {
                this.logger.log(`[DAILY_REPORT] Recommendations:`);
                healthReport.recommendations.forEach((rec, index) => {
                    this.logger.log(`  ${index + 1}. ${rec}`);
                });
            }
            
        } catch (error) {
            this.logger.error(`Failed to generate daily report: ${error}`, 'StripeSettlementMonitor');
        }
    }

    /**
     * Clean up old metrics data
     * Runs weekly on Sunday at 2 AM
     */
    @Cron('0 0 2 * * 0') // Weekly on Sunday at 2 AM
    async performWeeklyMaintenance(): Promise<void> {
        if (!this.monitoringEnabled) {
            return;
        }

        try {
            this.logger.log('Performing weekly Stripe settlement maintenance');
            
            // Generate weekly summary
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            
            const weeklyReport = await this.loggerService.generateSettlementSummary(weekAgo, new Date());
            
            this.logger.log(`[WEEKLY_REPORT] Settlement Summary (Last 7 Days):`);
            this.logger.log(`  - Total Attempts: ${weeklyReport.summary.totalAttempts}`);
            this.logger.log(`  - Successful: ${weeklyReport.summary.successfulSettlements}`);
            this.logger.log(`  - Failed: ${weeklyReport.summary.failedSettlements}`);
            this.logger.log(`  - Success Rate: ${(weeklyReport.summary.successRate * 100).toFixed(2)}%`);
            this.logger.log(`  - Average Duration: ${weeklyReport.summary.averageDurationMs.toFixed(0)}ms`);
            
            // Log error breakdown if available
            if (Object.keys(weeklyReport.errorBreakdown).length > 0) {
                this.logger.log(`[WEEKLY_REPORT] Error Breakdown:`);
                Object.entries(weeklyReport.errorBreakdown).forEach(([category, count]) => {
                    this.logger.log(`  - ${category}: ${count}`);
                });
            }
            
            // Reset weekly metrics (optional - comment out if you want to keep historical data)
            // this.metricsService.resetMetrics();
            // this.logger.log('Weekly metrics reset completed');
            
        } catch (error) {
            this.logger.error(`Weekly maintenance failed: ${error}`, 'StripeSettlementMonitor');
        }
    }

    /**
     * Log current system status
     */
    private async logSystemStatus(): Promise<void> {
        try {
            const healthReport = await this.metricsService.generateHealthReport();
            const metrics = this.metricsService.getMetricsSummary();
            
            this.logger.log(`[SYSTEM_STATUS] Stripe Settlement System Health: ${healthReport.status.toUpperCase()}`);
            this.logger.log(`[SYSTEM_STATUS] Current Metrics - Attempts: ${metrics.settlementStats.attempts}, Success Rate: ${(metrics.settlementStats.successRate * 100).toFixed(1)}%`);
            
            if (healthReport.status !== 'healthy') {
                this.logger.warn(`[SYSTEM_STATUS] Issues detected: ${healthReport.summary}`);
                healthReport.recommendations.forEach((rec, index) => {
                    this.logger.warn(`[SYSTEM_STATUS] Recommendation ${index + 1}: ${rec}`);
                });
            }
            
        } catch (error) {
            this.logger.error(`Failed to log system status: ${error}`, 'StripeSettlementMonitor');
        }
    }

    /**
     * Enable/disable monitoring (for maintenance or testing)
     */
    setMonitoringEnabled(enabled: boolean): void {
        this.monitoringEnabled = enabled;
        this.logger.log(`Monitoring ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current monitoring status
     */
    getMonitoringStatus(): {
        enabled: boolean;
        isRunning: boolean;
        lastHealthCheck: string;
    } {
        return {
            enabled: this.monitoringEnabled,
            isRunning: this.isRunning,
            lastHealthCheck: new Date().toISOString()
        };
    }

    /**
     * Manually trigger health check (for testing or immediate assessment)
     */
    async triggerHealthCheck(): Promise<{
        success: boolean;
        message: string;
        healthReport?: any;
    }> {
        try {
            this.logger.log('Manual health check triggered');
            
            await this.alertingService.checkAndSendAlerts();
            const healthReport = await this.metricsService.generateHealthReport();
            
            return {
                success: true,
                message: `Health check completed. Status: ${healthReport.status}`,
                healthReport
            };
            
        } catch (error) {
            this.logger.error(`Manual health check failed: ${error}`);
            return {
                success: false,
                message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }

    /**
     * Generate immediate summary report
     */
    async generateImmediateReport(): Promise<{
        timestamp: string;
        metrics: any;
        databaseStats: any;
        healthReport: any;
        alertStates: any;
    }> {
        const metrics = this.metricsService.getMetricsSummary();
        const dbStats = await this.metricsService.getDatabaseStats();
        const healthReport = await this.metricsService.generateHealthReport();
        const alertStates = this.alertingService.getAlertStates();
        
        return {
            timestamp: new Date().toISOString(),
            metrics,
            databaseStats: dbStats,
            healthReport,
            alertStates
        };
    }
}