import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { StripePaymentMetricsService } from './stripe-payment-metrics.service';
import { PaymentLogger } from '../../utils/payment-logger';

/**
 * Background monitoring service for Stripe payment metrics
 * Provides periodic logging, alerting, and health checks
 */
@Injectable()
export class StripeMonitoringService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('StripeMonitoring');
    private metricsInterval: NodeJS.Timeout | null = null;
    private healthCheckInterval: NodeJS.Timeout | null = null;
    private alertingEnabled = true;
    
    // Monitoring configuration
    private readonly config = {
        metricsLogInterval: 5 * 60 * 1000, // Log metrics every 5 minutes
        healthCheckInterval: 60 * 1000, // Health check every minute
        alertCooldown: 15 * 60 * 1000, // 15 minutes between similar alerts
        thresholds: {
            lowSuccessRate: 85, // Alert if success rate drops below 85%
            highFailureRate: 10, // Alert if failure rate exceeds 10%
            consecutiveFailures: 5, // Alert after 5 consecutive failures
            slowSettlement: 10000, // Alert if average settlement time exceeds 10 seconds
            highApiFailureRate: 15, // Alert if Stripe API failure rate exceeds 15%
        }
    };

    private lastAlerts = new Map<string, number>();

    constructor(private metricsService: StripePaymentMetricsService) {}

    onModuleInit() {
        this.logger.log('Starting Stripe payment monitoring service');
        this.startPeriodicMetricsLogging();
        this.startHealthChecks();
    }

    onModuleDestroy() {
        this.logger.log('Stopping Stripe payment monitoring service');
        this.stopMonitoring();
    }

    /**
     * Start periodic metrics logging
     */
    private startPeriodicMetricsLogging(): void {
        this.metricsInterval = setInterval(() => {
            try {
                this.logPeriodicMetrics();
            } catch (error) {
                this.logger.error(`Error in periodic metrics logging: ${error}`);
            }
        }, this.config.metricsLogInterval);

        this.logger.log(`Periodic metrics logging started (interval: ${this.config.metricsLogInterval / 1000}s)`);
    }

    /**
     * Start health checks and alerting
     */
    private startHealthChecks(): void {
        this.healthCheckInterval = setInterval(() => {
            try {
                this.performHealthCheck();
            } catch (error) {
                this.logger.error(`Error in health check: ${error}`);
            }
        }, this.config.healthCheckInterval);

        this.logger.log(`Health checks started (interval: ${this.config.healthCheckInterval / 1000}s)`);
    }

    /**
     * Stop all monitoring activities
     */
    private stopMonitoring(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }

        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }

    /**
     * Log comprehensive metrics summary periodically
     */
    private logPeriodicMetrics(): void {
        const summary = this.metricsService.getMetricsSummary();
        
        this.logger.log(`📊 PERIODIC METRICS REPORT:
🎯 Settlement Performance:
  • Success Rate: ${summary.settlement.successRate.toFixed(1)}% (${summary.settlement.successes}/${summary.settlement.attempts})
  • Average Time: ${summary.timing.averageSettlementTime}ms
  • Min/Max Time: ${summary.timing.minSettlementTime}ms / ${summary.timing.maxSettlementTime}ms
  • Duplicates Handled: ${summary.settlement.duplicates}

🔄 PaymentIntent Lifecycle:
  • Created: ${summary.paymentIntents.created}
  • Linked: ${summary.paymentIntents.linked} (${summary.paymentIntents.linkRate.toFixed(1)}%)
  • Settled: ${summary.paymentIntents.settled} (${summary.paymentIntents.settlementRate.toFixed(1)}%)
  • Failed: ${summary.paymentIntents.failed}

🌐 Stripe API Health:
  • Total Calls: ${summary.api.calls}
  • Failure Rate: ${summary.api.failureRate.toFixed(1)}%
  • Retry Rate: ${summary.api.retryRate.toFixed(1)}%
  • Average Response Time: ${summary.timing.averageApiTime}ms

⚠️ Error Analysis:
  • Top Error Type: ${summary.errors.topErrorType || 'None'}
  • Top Status Issue: ${summary.errors.topStatus || 'None'}
  • Consecutive Failures: ${summary.settlement.consecutiveFailures}

⏱️ System Health:
  • Uptime: ${summary.uptime.hours.toFixed(1)} hours
  • Since: ${summary.uptime.since}`);

        // Log to audit trail for compliance
        PaymentLogger.logPaymentEvent('settle', {
            status: 'metrics_report',
            responseText: `Success rate: ${summary.settlement.successRate.toFixed(1)}%, Settlements: ${summary.settlement.successes}/${summary.settlement.attempts}`
        });

        // Log detailed metrics to file for analysis
        this.logDetailedMetricsToFile(summary);
    }

    /**
     * Perform health checks and trigger alerts if needed
     */
    private performHealthCheck(): void {
        const summary = this.metricsService.getMetricsSummary();
        
        // Only perform checks if we have enough data
        if (summary.settlement.attempts < 3) {
            return;
        }

        this.checkSuccessRate(summary);
        this.checkConsecutiveFailures(summary);
        this.checkSettlementTiming(summary);
        this.checkApiHealth(summary);
        this.checkErrorPatterns(summary);
    }

    /**
     * Check settlement success rate and alert if too low
     */
    private checkSuccessRate(summary: any): void {
        if (summary.settlement.successRate < this.config.thresholds.lowSuccessRate) {
            this.triggerAlert(
                'low_success_rate',
                `🚨 LOW SUCCESS RATE ALERT: Settlement success rate dropped to ${summary.settlement.successRate.toFixed(1)}% (${summary.settlement.successes}/${summary.settlement.attempts})`,
                'high',
                {
                    successRate: summary.settlement.successRate,
                    attempts: summary.settlement.attempts,
                    successes: summary.settlement.successes,
                    threshold: this.config.thresholds.lowSuccessRate
                }
            );
        }
    }

    /**
     * Check for consecutive failures
     */
    private checkConsecutiveFailures(summary: any): void {
        if (summary.settlement.consecutiveFailures >= this.config.thresholds.consecutiveFailures) {
            this.triggerAlert(
                'consecutive_failures',
                `🚨 CONSECUTIVE FAILURES ALERT: ${summary.settlement.consecutiveFailures} consecutive settlement failures detected`,
                'high',
                {
                    consecutiveFailures: summary.settlement.consecutiveFailures,
                    threshold: this.config.thresholds.consecutiveFailures
                }
            );
        }
    }

    /**
     * Check settlement timing performance
     */
    private checkSettlementTiming(summary: any): void {
        if (summary.timing.averageSettlementTime > this.config.thresholds.slowSettlement) {
            this.triggerAlert(
                'slow_settlement',
                `⚠️ SLOW SETTLEMENT ALERT: Average settlement time is ${summary.timing.averageSettlementTime}ms (threshold: ${this.config.thresholds.slowSettlement}ms)`,
                'medium',
                {
                    averageTime: summary.timing.averageSettlementTime,
                    maxTime: summary.timing.maxSettlementTime,
                    threshold: this.config.thresholds.slowSettlement
                }
            );
        }
    }

    /**
     * Check Stripe API health
     */
    private checkApiHealth(summary: any): void {
        if (summary.api.failureRate > this.config.thresholds.highApiFailureRate) {
            this.triggerAlert(
                'api_failures',
                `🚨 API FAILURE ALERT: Stripe API failure rate is ${summary.api.failureRate.toFixed(1)}% (${summary.api.failures}/${summary.api.calls})`,
                'high',
                {
                    failureRate: summary.api.failureRate,
                    failures: summary.api.failures,
                    calls: summary.api.calls,
                    threshold: this.config.thresholds.highApiFailureRate
                }
            );
        }
    }

    /**
     * Check for error patterns that might indicate issues
     */
    private checkErrorPatterns(summary: any): void {
        // Check if a single error type is dominating
        const topErrorType = summary.errors.topErrorType;
        if (topErrorType && summary.errors.byType[topErrorType] >= 5) {
            this.triggerAlert(
                'error_pattern',
                `⚠️ ERROR PATTERN ALERT: Frequent error type "${topErrorType}" (${summary.errors.byType[topErrorType]} occurrences)`,
                'medium',
                {
                    errorType: topErrorType,
                    count: summary.errors.byType[topErrorType],
                    errorsByType: summary.errors.byType
                }
            );
        }

        // Check for problematic payment statuses
        const topStatus = summary.errors.topStatus;
        if (topStatus && summary.errors.byStatus[topStatus] >= 5 && 
            ['requires_payment_method', 'canceled', 'requires_action'].includes(topStatus)) {
            this.triggerAlert(
                'status_pattern',
                `⚠️ STATUS PATTERN ALERT: Frequent problematic status "${topStatus}" (${summary.errors.byStatus[topStatus]} occurrences)`,
                'medium',
                {
                    status: topStatus,
                    count: summary.errors.byStatus[topStatus],
                    statusDistribution: summary.errors.byStatus
                }
            );
        }
    }

    /**
     * Trigger an alert with cooldown logic
     */
    private triggerAlert(
        alertType: string,
        message: string,
        severity: 'low' | 'medium' | 'high',
        data?: any
    ): void {
        if (!this.alertingEnabled) {
            return;
        }

        const now = Date.now();
        const lastAlert = this.lastAlerts.get(alertType) || 0;

        // Check cooldown
        if (now - lastAlert < this.config.alertCooldown) {
            return;
        }

        // Log the alert
        if (severity === 'high') {
            this.logger.error(message);
        } else if (severity === 'medium') {
            this.logger.warn(message);
        } else {
            this.logger.log(message);
        }

        // Log to security/audit trail
        PaymentLogger.logSuspiciousActivity(
            alertType,
            message,
            undefined,
            severity
        );

        // Log detailed alert data
        if (data) {
            this.logger.debug(`Alert data for ${alertType}: ${JSON.stringify(data, null, 2)}`);
        }

        // Update last alert time
        this.lastAlerts.set(alertType, now);

        // In production, you might want to send notifications here
        // this.sendNotification(alertType, message, severity, data);
    }

    /**
     * Log detailed metrics to file for analysis and reporting
     */
    private logDetailedMetricsToFile(summary: any): void {
        try {
            const detailedLog = {
                timestamp: new Date().toISOString(),
                type: 'stripe_payment_metrics',
                summary: summary,
                environment: process.env.NODE_ENV || 'development',
                version: '1.0.0'
            };

            // Use PaymentLogger to write to audit trail
            PaymentLogger.logPaymentEvent('settle', {
                status: 'detailed_metrics',
                responseText: JSON.stringify(detailedLog)
            });

        } catch (error) {
            this.logger.error(`Failed to log detailed metrics: ${error}`);
        }
    }

    /**
     * Enable or disable alerting
     */
    setAlertingEnabled(enabled: boolean): void {
        this.alertingEnabled = enabled;
        this.logger.log(`Alerting ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get current monitoring status
     */
    getMonitoringStatus(): {
        metricsLogging: boolean;
        healthChecks: boolean;
        alerting: boolean;
        config: any;
        lastAlerts: Record<string, string>;
    } {
        return {
            metricsLogging: this.metricsInterval !== null,
            healthChecks: this.healthCheckInterval !== null,
            alerting: this.alertingEnabled,
            config: this.config,
            lastAlerts: Object.fromEntries(
                Array.from(this.lastAlerts.entries()).map(([type, timestamp]) => [
                    type,
                    new Date(timestamp).toISOString()
                ])
            )
        };
    }

    /**
     * Force a metrics report (useful for testing)
     */
    forceMetricsReport(): void {
        this.logger.log('Forcing metrics report...');
        this.logPeriodicMetrics();
    }

    /**
     * Force a health check (useful for testing)
     */
    forceHealthCheck(): void {
        this.logger.log('Forcing health check...');
        this.performHealthCheck();
    }

    /**
     * Clear alert cooldowns (useful for testing)
     */
    clearAlertCooldowns(): void {
        this.lastAlerts.clear();
        this.logger.log('Alert cooldowns cleared');
    }
}