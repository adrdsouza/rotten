import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection } from '@vendure/core';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';

/**
 * Metrics and monitoring service for Stripe payment settlement operations
 * Tracks success rates, timing, and provides alerting for failed operations
 */
@Injectable()
export class StripeSettlementMetricsService {
    private readonly logger = new Logger('StripeSettlementMetrics');
    
    // In-memory metrics storage (in production, consider using Redis or external metrics service)
    private metrics = {
        settlementAttempts: 0,
        settlementSuccesses: 0,
        settlementFailures: 0,
        apiVerificationAttempts: 0,
        apiVerificationSuccesses: 0,
        apiVerificationFailures: 0,
        averageSettlementTime: 0,
        lastResetTime: new Date(),
        consecutiveFailures: 0,
        lastFailureTime: null as Date | null,
        dailyStats: new Map<string, {
            attempts: number;
            successes: number;
            failures: number;
            totalTime: number;
        }>()
    };

    // Alert thresholds
    private readonly ALERT_THRESHOLDS = {
        errorRate: 0.05, // 5% error rate
        consecutiveFailures: 3,
        avgSettlementTimeMs: 10000, // 10 seconds
        dailyFailureThreshold: 10
    };

    constructor(private connection: TransactionalConnection) {}

    /**
     * Record a settlement attempt start
     */
    recordSettlementAttempt(paymentIntentId: string, orderCode: string): string {
        const attemptId = `${paymentIntentId}_${Date.now()}`;
        this.metrics.settlementAttempts++;
        
        this.logger.log(`[METRICS] Settlement attempt started - ID: ${attemptId}, PaymentIntent: ${paymentIntentId}, Order: ${orderCode}`);
        
        return attemptId;
    }

    /**
     * Record a successful settlement
     */
    recordSettlementSuccess(
        attemptId: string, 
        paymentIntentId: string, 
        orderCode: string, 
        durationMs: number,
        paymentId?: string
    ): void {
        this.metrics.settlementSuccesses++;
        this.metrics.consecutiveFailures = 0; // Reset consecutive failures
        this.updateAverageSettlementTime(durationMs);
        this.updateDailyStats('success', durationMs);
        
        this.logger.log(
            `[METRICS] Settlement SUCCESS - Attempt: ${attemptId}, PaymentIntent: ${paymentIntentId}, ` +
            `Order: ${orderCode}, Duration: ${durationMs}ms, PaymentID: ${paymentId || 'N/A'}`
        );

        // Log success rate
        const successRate = this.getSuccessRate();
        this.logger.log(`[METRICS] Current settlement success rate: ${(successRate * 100).toFixed(2)}%`);
    }

    /**
     * Record a failed settlement
     */
    recordSettlementFailure(
        attemptId: string, 
        paymentIntentId: string, 
        orderCode: string, 
        error: string, 
        durationMs: number,
        errorCategory?: 'validation' | 'api' | 'database' | 'unknown'
    ): void {
        this.metrics.settlementFailures++;
        this.metrics.consecutiveFailures++;
        this.metrics.lastFailureTime = new Date();
        this.updateDailyStats('failure', durationMs);
        
        this.logger.error(
            `[METRICS] Settlement FAILURE - Attempt: ${attemptId}, PaymentIntent: ${paymentIntentId}, ` +
            `Order: ${orderCode}, Duration: ${durationMs}ms, Error: ${error}, Category: ${errorCategory || 'unknown'}`
        );

        // Check for alert conditions
        this.checkAlertConditions();
    }

    /**
     * Record API verification attempt
     */
    recordApiVerificationAttempt(paymentIntentId: string): void {
        this.metrics.apiVerificationAttempts++;
        this.logger.debug(`[METRICS] API verification attempt - PaymentIntent: ${paymentIntentId}`);
    }

    /**
     * Record successful API verification
     */
    recordApiVerificationSuccess(paymentIntentId: string, status: string, durationMs: number): void {
        this.metrics.apiVerificationSuccesses++;
        this.logger.log(
            `[METRICS] API verification SUCCESS - PaymentIntent: ${paymentIntentId}, ` +
            `Status: ${status}, Duration: ${durationMs}ms`
        );
    }

    /**
     * Record failed API verification
     */
    recordApiVerificationFailure(paymentIntentId: string, error: string, durationMs: number): void {
        this.metrics.apiVerificationFailures++;
        this.logger.error(
            `[METRICS] API verification FAILURE - PaymentIntent: ${paymentIntentId}, ` +
            `Error: ${error}, Duration: ${durationMs}ms`
        );
    }

    /**
     * Record PaymentIntent lifecycle event
     */
    recordPaymentIntentLifecycle(
        paymentIntentId: string, 
        event: 'created' | 'linked' | 'confirmed' | 'settled' | 'failed',
        orderCode?: string,
        metadata?: Record<string, any>
    ): void {
        const logMessage = `[LIFECYCLE] PaymentIntent ${paymentIntentId} - Event: ${event}` +
            (orderCode ? `, Order: ${orderCode}` : '') +
            (metadata ? `, Metadata: ${JSON.stringify(metadata)}` : '');
        
        this.logger.log(logMessage);
    }

    /**
     * Get current metrics summary
     */
    getMetricsSummary(): {
        settlementStats: {
            attempts: number;
            successes: number;
            failures: number;
            successRate: number;
            consecutiveFailures: number;
            averageTimeMs: number;
        };
        apiVerificationStats: {
            attempts: number;
            successes: number;
            failures: number;
            successRate: number;
        };
        alerts: {
            highErrorRate: boolean;
            consecutiveFailures: boolean;
            slowSettlement: boolean;
        };
        lastResetTime: Date;
    } {
        const settlementSuccessRate = this.getSuccessRate();
        const apiSuccessRate = this.getApiVerificationSuccessRate();
        
        return {
            settlementStats: {
                attempts: this.metrics.settlementAttempts,
                successes: this.metrics.settlementSuccesses,
                failures: this.metrics.settlementFailures,
                successRate: settlementSuccessRate,
                consecutiveFailures: this.metrics.consecutiveFailures,
                averageTimeMs: this.metrics.averageSettlementTime
            },
            apiVerificationStats: {
                attempts: this.metrics.apiVerificationAttempts,
                successes: this.metrics.apiVerificationSuccesses,
                failures: this.metrics.apiVerificationFailures,
                successRate: apiSuccessRate
            },
            alerts: {
                highErrorRate: settlementSuccessRate < (1 - this.ALERT_THRESHOLDS.errorRate),
                consecutiveFailures: this.metrics.consecutiveFailures >= this.ALERT_THRESHOLDS.consecutiveFailures,
                slowSettlement: this.metrics.averageSettlementTime > this.ALERT_THRESHOLDS.avgSettlementTimeMs
            },
            lastResetTime: this.metrics.lastResetTime
        };
    }

    /**
     * Get daily statistics
     */
    getDailyStats(date?: string): {
        date: string;
        attempts: number;
        successes: number;
        failures: number;
        successRate: number;
        averageTimeMs: number;
    } | null {
        const targetDate = date || new Date().toISOString().split('T')[0];
        const stats = this.metrics.dailyStats.get(targetDate);
        
        if (!stats) {
            return null;
        }
        
        return {
            date: targetDate,
            attempts: stats.attempts,
            successes: stats.successes,
            failures: stats.failures,
            successRate: stats.attempts > 0 ? stats.successes / stats.attempts : 0,
            averageTimeMs: stats.attempts > 0 ? stats.totalTime / stats.attempts : 0
        };
    }

    /**
     * Get database statistics for pending payments
     */
    async getDatabaseStats(): Promise<{
        totalPendingPayments: number;
        pendingByStatus: Record<string, number>;
        oldestPendingPayment: Date | null;
        paymentsLast24Hours: number;
    }> {
        const repository = this.connection.getRepository(PendingStripePayment);
        
        // Get total count
        const totalPendingPayments = await repository.count();
        
        // Get counts by status
        const statusCounts = await repository
            .createQueryBuilder('payment')
            .select('payment.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('payment.status')
            .getRawMany();
        
        const pendingByStatus: Record<string, number> = {};
        statusCounts.forEach(row => {
            pendingByStatus[row.status] = parseInt(row.count);
        });
        
        // Get oldest pending payment
        const oldestPending = await repository
            .createQueryBuilder('payment')
            .where('payment.status = :status', { status: 'pending' })
            .orderBy('payment.createdAt', 'ASC')
            .getOne();
        
        // Get payments created in last 24 hours
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        
        const paymentsLast24Hours = await repository
            .createQueryBuilder('payment')
            .where('payment.createdAt >= :yesterday', { yesterday })
            .getCount();
        
        return {
            totalPendingPayments,
            pendingByStatus,
            oldestPendingPayment: oldestPending?.createdAt || null,
            paymentsLast24Hours
        };
    }

    /**
     * Reset metrics (useful for testing or periodic resets)
     */
    resetMetrics(): void {
        this.metrics = {
            settlementAttempts: 0,
            settlementSuccesses: 0,
            settlementFailures: 0,
            apiVerificationAttempts: 0,
            apiVerificationSuccesses: 0,
            apiVerificationFailures: 0,
            averageSettlementTime: 0,
            lastResetTime: new Date(),
            consecutiveFailures: 0,
            lastFailureTime: null,
            dailyStats: new Map()
        };
        
        this.logger.log('[METRICS] Metrics reset');
    }

    /**
     * Generate health report
     */
    async generateHealthReport(): Promise<{
        status: 'healthy' | 'warning' | 'critical';
        summary: string;
        details: any;
        recommendations: string[];
    }> {
        const metrics = this.getMetricsSummary();
        const dbStats = await this.getDatabaseStats();
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy';
        const recommendations: string[] = [];
        
        // Check for critical issues
        if (metrics.alerts.consecutiveFailures) {
            status = 'critical';
            recommendations.push(`${metrics.settlementStats.consecutiveFailures} consecutive settlement failures detected. Investigate immediately.`);
        }
        
        if (metrics.alerts.highErrorRate && metrics.settlementStats.attempts > 10) {
            status = status === 'critical' ? 'critical' : 'warning';
            recommendations.push(`High error rate: ${(100 - metrics.settlementStats.successRate * 100).toFixed(1)}%. Review recent failures.`);
        }
        
        if (metrics.alerts.slowSettlement) {
            status = status === 'critical' ? 'critical' : 'warning';
            recommendations.push(`Slow settlement times: ${metrics.settlementStats.averageTimeMs}ms average. Check Stripe API performance.`);
        }
        
        // Check database health
        if (dbStats.totalPendingPayments > 100) {
            status = status === 'critical' ? 'critical' : 'warning';
            recommendations.push(`High number of pending payments: ${dbStats.totalPendingPayments}. Review settlement process.`);
        }
        
        if (dbStats.oldestPendingPayment) {
            const ageHours = (Date.now() - dbStats.oldestPendingPayment.getTime()) / (1000 * 60 * 60);
            if (ageHours > 24) {
                status = status === 'critical' ? 'critical' : 'warning';
                recommendations.push(`Oldest pending payment is ${ageHours.toFixed(1)} hours old. Investigate stuck payments.`);
            }
        }
        
        if (recommendations.length === 0) {
            recommendations.push('All metrics are within normal ranges.');
        }
        
        const summary = status === 'healthy' 
            ? 'Stripe settlement system is operating normally'
            : status === 'warning'
            ? 'Stripe settlement system has some issues that need attention'
            : 'Stripe settlement system has critical issues requiring immediate attention';
        
        return {
            status,
            summary,
            details: {
                metrics,
                database: dbStats,
                timestamp: new Date().toISOString()
            },
            recommendations
        };
    }

    // Private helper methods

    private getSuccessRate(): number {
        if (this.metrics.settlementAttempts === 0) return 1;
        return this.metrics.settlementSuccesses / this.metrics.settlementAttempts;
    }

    private getApiVerificationSuccessRate(): number {
        if (this.metrics.apiVerificationAttempts === 0) return 1;
        return this.metrics.apiVerificationSuccesses / this.metrics.apiVerificationAttempts;
    }

    private updateAverageSettlementTime(durationMs: number): void {
        const totalSuccesses = this.metrics.settlementSuccesses;
        if (totalSuccesses === 1) {
            this.metrics.averageSettlementTime = durationMs;
        } else {
            // Calculate running average
            this.metrics.averageSettlementTime = 
                ((this.metrics.averageSettlementTime * (totalSuccesses - 1)) + durationMs) / totalSuccesses;
        }
    }

    private updateDailyStats(type: 'success' | 'failure', durationMs: number): void {
        const today = new Date().toISOString().split('T')[0];
        
        if (!this.metrics.dailyStats.has(today)) {
            this.metrics.dailyStats.set(today, {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalTime: 0
            });
        }
        
        const stats = this.metrics.dailyStats.get(today)!;
        stats.attempts++;
        stats.totalTime += durationMs;
        
        if (type === 'success') {
            stats.successes++;
        } else {
            stats.failures++;
        }
    }

    private checkAlertConditions(): void {
        const metrics = this.getMetricsSummary();
        
        // Alert on consecutive failures
        if (metrics.alerts.consecutiveFailures) {
            this.logger.error(
                `[ALERT] CONSECUTIVE_FAILURES: ${this.metrics.consecutiveFailures} consecutive settlement failures detected. ` +
                `Last failure: ${this.metrics.lastFailureTime?.toISOString()}`
            );
        }
        
        // Alert on high error rate (only if we have enough samples)
        if (metrics.alerts.highErrorRate && this.metrics.settlementAttempts >= 10) {
            this.logger.error(
                `[ALERT] HIGH_ERROR_RATE: Settlement error rate is ${((1 - metrics.settlementStats.successRate) * 100).toFixed(1)}% ` +
                `(${this.metrics.settlementFailures}/${this.metrics.settlementAttempts})`
            );
        }
        
        // Alert on slow settlements
        if (metrics.alerts.slowSettlement) {
            this.logger.warn(
                `[ALERT] SLOW_SETTLEMENT: Average settlement time is ${this.metrics.averageSettlementTime.toFixed(0)}ms ` +
                `(threshold: ${this.ALERT_THRESHOLDS.avgSettlementTimeMs}ms)`
            );
        }
    }
}