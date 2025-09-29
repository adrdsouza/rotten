import { Injectable, Logger } from '@nestjs/common';
import { StripeSettlementMetricsService } from './stripe-settlement-metrics.service';

/**
 * Alerting service for Stripe payment settlement operations
 * Monitors metrics and sends alerts when thresholds are exceeded
 */
@Injectable()
export class StripeSettlementAlertingService {
    private readonly logger = new Logger('StripeSettlementAlerting');
    
    // Track alert states to prevent spam
    private alertStates = {
        consecutiveFailures: false,
        highErrorRate: false,
        slowSettlement: false,
        stuckPayments: false,
        highVolume: false
    };

    // Alert cooldown periods (in milliseconds)
    private readonly ALERT_COOLDOWNS = {
        consecutiveFailures: 5 * 60 * 1000, // 5 minutes
        highErrorRate: 10 * 60 * 1000, // 10 minutes
        slowSettlement: 15 * 60 * 1000, // 15 minutes
        stuckPayments: 30 * 60 * 1000, // 30 minutes
        highVolume: 60 * 60 * 1000 // 1 hour
    };

    private lastAlertTimes = new Map<string, number>();

    constructor(private metricsService: StripeSettlementMetricsService) {}

    /**
     * Check all alert conditions and send notifications if needed
     */
    async checkAndSendAlerts(): Promise<void> {
        try {
            const healthReport = await this.metricsService.generateHealthReport();
            const metrics = this.metricsService.getMetricsSummary();
            const dbStats = await this.metricsService.getDatabaseStats();

            // Check consecutive failures
            await this.checkConsecutiveFailures(metrics.settlementStats.consecutiveFailures);

            // Check high error rate
            await this.checkHighErrorRate(
                metrics.settlementStats.successRate, 
                metrics.settlementStats.attempts
            );

            // Check slow settlement times
            await this.checkSlowSettlement(metrics.settlementStats.averageTimeMs);

            // Check for stuck payments
            await this.checkStuckPayments(dbStats);

            // Check high volume of pending payments
            await this.checkHighVolume(dbStats.totalPendingPayments);

            // Send critical status alert if system is in critical state
            if (healthReport.status === 'critical') {
                await this.sendCriticalSystemAlert(healthReport);
            }

        } catch (error) {
            this.logger.error(`Error checking alerts: ${error}`, 'StripeSettlementAlerting');
        }
    }

    /**
     * Check for consecutive settlement failures
     */
    private async checkConsecutiveFailures(consecutiveFailures: number): Promise<void> {
        const threshold = 3;
        const alertKey = 'consecutiveFailures';

        if (consecutiveFailures >= threshold && !this.isInCooldown(alertKey)) {
            await this.sendAlert({
                type: 'consecutive_failures',
                severity: 'critical',
                title: 'Consecutive Stripe Settlement Failures',
                message: `${consecutiveFailures} consecutive settlement failures detected. Immediate investigation required.`,
                details: {
                    consecutiveFailures,
                    threshold,
                    timestamp: new Date().toISOString()
                },
                actions: [
                    'Check Stripe API status and connectivity',
                    'Review recent error logs for patterns',
                    'Verify database connectivity',
                    'Check for configuration changes'
                ]
            });

            this.setAlertCooldown(alertKey);
            this.alertStates.consecutiveFailures = true;
        } else if (consecutiveFailures === 0 && this.alertStates.consecutiveFailures) {
            // Recovery notification
            await this.sendRecoveryAlert({
                type: 'consecutive_failures_resolved',
                title: 'Stripe Settlement Failures Resolved',
                message: 'Consecutive settlement failures have been resolved. System is operating normally.'
            });

            this.alertStates.consecutiveFailures = false;
        }
    }

    /**
     * Check for high error rate
     */
    private async checkHighErrorRate(successRate: number, totalAttempts: number): Promise<void> {
        const errorRate = 1 - successRate;
        const threshold = 0.05; // 5%
        const minAttempts = 10; // Only alert if we have enough samples
        const alertKey = 'highErrorRate';

        if (errorRate > threshold && totalAttempts >= minAttempts && !this.isInCooldown(alertKey)) {
            await this.sendAlert({
                type: 'high_error_rate',
                severity: 'warning',
                title: 'High Stripe Settlement Error Rate',
                message: `Settlement error rate is ${(errorRate * 100).toFixed(1)}% (${Math.round(errorRate * totalAttempts)}/${totalAttempts} attempts failed)`,
                details: {
                    errorRate: errorRate * 100,
                    threshold: threshold * 100,
                    totalAttempts,
                    failedAttempts: Math.round(errorRate * totalAttempts),
                    timestamp: new Date().toISOString()
                },
                actions: [
                    'Review recent error patterns',
                    'Check Stripe API performance',
                    'Verify payment validation logic',
                    'Monitor for improvement over next hour'
                ]
            });

            this.setAlertCooldown(alertKey);
            this.alertStates.highErrorRate = true;
        } else if (errorRate <= threshold && this.alertStates.highErrorRate) {
            // Recovery notification
            await this.sendRecoveryAlert({
                type: 'high_error_rate_resolved',
                title: 'Stripe Settlement Error Rate Normalized',
                message: `Error rate has returned to normal levels: ${(errorRate * 100).toFixed(1)}%`
            });

            this.alertStates.highErrorRate = false;
        }
    }

    /**
     * Check for slow settlement times
     */
    private async checkSlowSettlement(averageTimeMs: number): Promise<void> {
        const threshold = 10000; // 10 seconds
        const alertKey = 'slowSettlement';

        if (averageTimeMs > threshold && !this.isInCooldown(alertKey)) {
            await this.sendAlert({
                type: 'slow_settlement',
                severity: 'warning',
                title: 'Slow Stripe Settlement Performance',
                message: `Average settlement time is ${(averageTimeMs / 1000).toFixed(1)} seconds (threshold: ${threshold / 1000} seconds)`,
                details: {
                    averageTimeMs,
                    thresholdMs: threshold,
                    averageTimeSeconds: averageTimeMs / 1000,
                    thresholdSeconds: threshold / 1000,
                    timestamp: new Date().toISOString()
                },
                actions: [
                    'Check Stripe API response times',
                    'Monitor database performance',
                    'Review network connectivity',
                    'Check for resource constraints'
                ]
            });

            this.setAlertCooldown(alertKey);
            this.alertStates.slowSettlement = true;
        } else if (averageTimeMs <= threshold && this.alertStates.slowSettlement) {
            // Recovery notification
            await this.sendRecoveryAlert({
                type: 'slow_settlement_resolved',
                title: 'Stripe Settlement Performance Improved',
                message: `Settlement times have improved to ${(averageTimeMs / 1000).toFixed(1)} seconds`
            });

            this.alertStates.slowSettlement = false;
        }
    }

    /**
     * Check for stuck payments (old pending payments)
     */
    private async checkStuckPayments(dbStats: any): Promise<void> {
        const alertKey = 'stuckPayments';
        
        if (dbStats.oldestPendingPayment) {
            const ageHours = (Date.now() - new Date(dbStats.oldestPendingPayment).getTime()) / (1000 * 60 * 60);
            const threshold = 24; // 24 hours

            if (ageHours > threshold && !this.isInCooldown(alertKey)) {
                await this.sendAlert({
                    type: 'stuck_payments',
                    severity: 'warning',
                    title: 'Old Pending Stripe Payments Detected',
                    message: `Oldest pending payment is ${ageHours.toFixed(1)} hours old. ${dbStats.totalPendingPayments} total pending payments.`,
                    details: {
                        oldestPaymentAgeHours: ageHours,
                        threshold,
                        totalPendingPayments: dbStats.totalPendingPayments,
                        pendingByStatus: dbStats.pendingByStatus,
                        timestamp: new Date().toISOString()
                    },
                    actions: [
                        'Review stuck payment records',
                        'Check for failed webhook deliveries',
                        'Manually investigate oldest payments',
                        'Consider implementing cleanup job'
                    ]
                });

                this.setAlertCooldown(alertKey);
                this.alertStates.stuckPayments = true;
            }
        } else if (this.alertStates.stuckPayments) {
            // Recovery notification
            await this.sendRecoveryAlert({
                type: 'stuck_payments_resolved',
                title: 'Stuck Stripe Payments Resolved',
                message: 'No old pending payments detected. All payments are processing normally.'
            });

            this.alertStates.stuckPayments = false;
        }
    }

    /**
     * Check for high volume of pending payments
     */
    private async checkHighVolume(totalPendingPayments: number): Promise<void> {
        const threshold = 100;
        const alertKey = 'highVolume';

        if (totalPendingPayments > threshold && !this.isInCooldown(alertKey)) {
            await this.sendAlert({
                type: 'high_volume',
                severity: 'warning',
                title: 'High Volume of Pending Stripe Payments',
                message: `${totalPendingPayments} pending payments detected (threshold: ${threshold})`,
                details: {
                    totalPendingPayments,
                    threshold,
                    timestamp: new Date().toISOString()
                },
                actions: [
                    'Monitor settlement processing rate',
                    'Check for processing bottlenecks',
                    'Review recent traffic patterns',
                    'Consider scaling resources if needed'
                ]
            });

            this.setAlertCooldown(alertKey);
            this.alertStates.highVolume = true;
        } else if (totalPendingPayments <= threshold && this.alertStates.highVolume) {
            // Recovery notification
            await this.sendRecoveryAlert({
                type: 'high_volume_resolved',
                title: 'Pending Payment Volume Normalized',
                message: `Pending payment volume has returned to normal: ${totalPendingPayments} payments`
            });

            this.alertStates.highVolume = false;
        }
    }

    /**
     * Send critical system alert
     */
    private async sendCriticalSystemAlert(healthReport: any): Promise<void> {
        const alertKey = 'criticalSystem';

        if (!this.isInCooldown(alertKey)) {
            await this.sendAlert({
                type: 'critical_system',
                severity: 'critical',
                title: 'CRITICAL: Stripe Settlement System Issues',
                message: healthReport.summary,
                details: {
                    status: healthReport.status,
                    recommendations: healthReport.recommendations,
                    timestamp: new Date().toISOString()
                },
                actions: healthReport.recommendations
            });

            this.setAlertCooldown(alertKey);
        }
    }

    /**
     * Send alert notification
     */
    private async sendAlert(alert: {
        type: string;
        severity: 'info' | 'warning' | 'critical';
        title: string;
        message: string;
        details?: any;
        actions?: string[];
    }): Promise<void> {
        // Log the alert
        const logLevel = alert.severity === 'critical' ? 'error' : 'warn';
        this.logger[logLevel](`[ALERT] ${alert.title}: ${alert.message}`);

        // In a production environment, you would integrate with:
        // - Email notifications (SendGrid, AWS SES, etc.)
        // - Slack/Teams webhooks
        // - PagerDuty or similar incident management
        // - SMS notifications for critical alerts
        // - Monitoring dashboards (Grafana, DataDog, etc.)

        // For now, we'll log structured alert data
        this.logger.log(`[ALERT_DETAILS] ${JSON.stringify({
            ...alert,
            timestamp: new Date().toISOString()
        })}`);

        // Example integrations (commented out):
        /*
        if (alert.severity === 'critical') {
            await this.sendSlackAlert(alert);
            await this.sendEmailAlert(alert);
            await this.triggerPagerDuty(alert);
        } else if (alert.severity === 'warning') {
            await this.sendSlackAlert(alert);
            await this.sendEmailAlert(alert);
        }
        */
    }

    /**
     * Send recovery notification
     */
    private async sendRecoveryAlert(recovery: {
        type: string;
        title: string;
        message: string;
    }): Promise<void> {
        this.logger.log(`[RECOVERY] ${recovery.title}: ${recovery.message}`);

        // Log structured recovery data
        this.logger.log(`[RECOVERY_DETAILS] ${JSON.stringify({
            ...recovery,
            timestamp: new Date().toISOString()
        })}`);
    }

    /**
     * Check if an alert type is in cooldown period
     */
    private isInCooldown(alertKey: string): boolean {
        const lastAlertTime = this.lastAlertTimes.get(alertKey);
        if (!lastAlertTime) return false;

        const cooldownPeriod = this.ALERT_COOLDOWNS[alertKey as keyof typeof this.ALERT_COOLDOWNS] || 300000; // 5 min default
        return Date.now() - lastAlertTime < cooldownPeriod;
    }

    /**
     * Set cooldown for an alert type
     */
    private setAlertCooldown(alertKey: string): void {
        this.lastAlertTimes.set(alertKey, Date.now());
    }

    /**
     * Get current alert states (for debugging/monitoring)
     */
    getAlertStates(): {
        states: typeof this.alertStates;
        cooldowns: Record<string, number>;
    } {
        const cooldowns: Record<string, number> = {};
        
        for (const [key, lastTime] of this.lastAlertTimes.entries()) {
            const cooldownPeriod = this.ALERT_COOLDOWNS[key as keyof typeof this.ALERT_COOLDOWNS] || 300000;
            const remainingTime = Math.max(0, cooldownPeriod - (Date.now() - lastTime));
            cooldowns[key] = remainingTime;
        }

        return {
            states: { ...this.alertStates },
            cooldowns
        };
    }

    /**
     * Reset alert states (for testing)
     */
    resetAlertStates(): void {
        this.alertStates = {
            consecutiveFailures: false,
            highErrorRate: false,
            slowSettlement: false,
            stuckPayments: false,
            highVolume: false
        };
        this.lastAlertTimes.clear();
        
        this.logger.log('[ALERT_RESET] Alert states and cooldowns have been reset');
    }
}