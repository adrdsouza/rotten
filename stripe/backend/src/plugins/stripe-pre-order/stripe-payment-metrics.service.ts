import { Injectable, Logger } from '@nestjs/common';
import { PaymentLogger } from '../../utils/payment-logger';

/**
 * Comprehensive metrics and monitoring service for Stripe payment settlement
 * Tracks PaymentIntent lifecycle, settlement success rates, timing, and failures
 */
@Injectable()
export class StripePaymentMetricsService {
    private readonly logger = new Logger('StripePaymentMetrics');
    
    // In-memory metrics storage (in production, consider Redis or database)
    private metrics = {
        // Settlement metrics
        settlementAttempts: 0,
        settlementSuccesses: 0,
        settlementFailures: 0,
        duplicateSettlements: 0,
        
        // Timing metrics
        totalSettlementTime: 0,
        minSettlementTime: Infinity,
        maxSettlementTime: 0,
        
        // API metrics
        stripeApiCalls: 0,
        stripeApiFailures: 0,
        stripeApiRetries: 0,
        totalApiTime: 0,
        
        // PaymentIntent lifecycle tracking
        paymentIntentsCreated: 0,
        paymentIntentsLinked: 0,
        paymentIntentsSettled: 0,
        paymentIntentsFailed: 0,
        
        // Error tracking by type
        errorsByType: new Map<string, number>(),
        errorsByStatus: new Map<string, number>(),
        
        // Last reset timestamp
        lastReset: Date.now(),
        
        // Recent settlement times for calculating averages
        recentSettlementTimes: [] as number[],
        
        // Alert counters
        consecutiveFailures: 0,
        lastAlertTime: 0
    };

    private readonly MAX_RECENT_TIMES = 100; // Keep last 100 settlement times
    private readonly ALERT_COOLDOWN = 300000; // 5 minutes between alerts
    private readonly FAILURE_ALERT_THRESHOLD = 5; // Alert after 5 consecutive failures

    /**
     * Log PaymentIntent creation
     */
    logPaymentIntentCreated(paymentIntentId: string, estimatedTotal: number, currency: string): void {
        this.metrics.paymentIntentsCreated++;
        
        this.logger.log(`[METRICS] PaymentIntent created: ${paymentIntentId} | Amount: ${estimatedTotal} ${currency.toUpperCase()}`);
        
        PaymentLogger.logPaymentEvent('auth', {
            transactionId: paymentIntentId,
            amount: estimatedTotal,
            currency: currency,
            status: 'created'
        });
    }

    /**
     * Log PaymentIntent linking to order
     */
    logPaymentIntentLinked(
        paymentIntentId: string, 
        orderId: string, 
        orderCode: string, 
        finalTotal: number,
        customerEmail: string
    ): void {
        this.metrics.paymentIntentsLinked++;
        
        this.logger.log(`[METRICS] PaymentIntent linked: ${paymentIntentId} → Order ${orderCode} | Final: ${finalTotal} | Customer: ${customerEmail || 'guest'}`);
        
        PaymentLogger.logPaymentEvent('auth', {
            transactionId: paymentIntentId,
            orderId: orderId,
            amount: finalTotal,
            status: 'linked',
            customerReference: customerEmail
        });
    }

    /**
     * Log settlement attempt start
     */
    logSettlementAttemptStart(paymentIntentId: string, orderId?: string): number {
        this.metrics.settlementAttempts++;
        const startTime = Date.now();
        
        this.logger.log(`[METRICS] Settlement attempt started: ${paymentIntentId} | Order: ${orderId || 'unknown'} | Attempt #${this.metrics.settlementAttempts}`);
        
        return startTime;
    }

    /**
     * Log successful settlement
     */
    logSettlementSuccess(
        paymentIntentId: string, 
        orderId: string, 
        paymentId: string, 
        amount: number,
        currency: string,
        startTime: number
    ): void {
        const settlementTime = Date.now() - startTime;
        
        this.metrics.settlementSuccesses++;
        this.metrics.paymentIntentsSettled++;
        this.metrics.consecutiveFailures = 0; // Reset failure counter
        
        // Update timing metrics
        this.updateTimingMetrics(settlementTime);
        
        this.logger.log(`[METRICS] Settlement SUCCESS: ${paymentIntentId} → Payment ${paymentId} | Duration: ${settlementTime}ms | Amount: ${amount} ${currency.toUpperCase()}`);
        
        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderId,
            amount: amount,
            currency: currency,
            status: 'settled',
            gatewayTransactionId: paymentId
        });

        // Log success rate periodically
        if (this.metrics.settlementAttempts % 10 === 0) {
            this.logSuccessRateMetrics();
        }
    }

    /**
     * Log settlement failure
     */
    logSettlementFailure(
        paymentIntentId: string, 
        error: Error, 
        errorCode?: string,
        orderId?: string,
        startTime?: number
    ): void {
        const settlementTime = startTime ? Date.now() - startTime : 0;
        
        this.metrics.settlementFailures++;
        this.metrics.paymentIntentsFailed++;
        this.metrics.consecutiveFailures++;
        
        // Track error types
        const errorType = errorCode || error.constructor.name;
        this.metrics.errorsByType.set(errorType, (this.metrics.errorsByType.get(errorType) || 0) + 1);
        
        this.logger.error(`[METRICS] Settlement FAILURE: ${paymentIntentId} | Error: ${error.message} | Code: ${errorCode || 'unknown'} | Duration: ${settlementTime}ms`);
        
        PaymentLogger.logPaymentError('settlement', error, {
            orderId: orderId,
            transactionId: paymentIntentId
        }, {
            errorCode: errorCode,
            settlementTime: settlementTime
        });

        // Check for alert conditions
        this.checkFailureAlerts(paymentIntentId, error);
    }

    /**
     * Log duplicate settlement attempt (idempotency)
     */
    logDuplicateSettlement(paymentIntentId: string, existingPaymentId: string, orderId?: string): void {
        this.metrics.duplicateSettlements++;
        
        this.logger.log(`[METRICS] Duplicate settlement (idempotent): ${paymentIntentId} | Existing payment: ${existingPaymentId} | Order: ${orderId || 'unknown'}`);
        
        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderId,
            status: 'duplicate_ignored',
            gatewayTransactionId: existingPaymentId
        });
    }

    /**
     * Log Stripe API call metrics
     */
    logStripeApiCall(operation: string, paymentIntentId: string, startTime: number, success: boolean, attempt?: number): void {
        const apiTime = Date.now() - startTime;
        
        this.metrics.stripeApiCalls++;
        this.metrics.totalApiTime += apiTime;
        
        if (!success) {
            this.metrics.stripeApiFailures++;
        }
        
        if (attempt && attempt > 1) {
            this.metrics.stripeApiRetries++;
        }
        
        const status = success ? 'SUCCESS' : 'FAILURE';
        const retryInfo = attempt ? ` (attempt ${attempt})` : '';
        
        this.logger.log(`[METRICS] Stripe API ${operation}: ${paymentIntentId} | ${status} | Duration: ${apiTime}ms${retryInfo}`);
        
        if (!success) {
            this.logger.warn(`[METRICS] Stripe API failure rate: ${this.getApiFailureRate().toFixed(2)}%`);
        }
    }

    /**
     * Log PaymentIntent status validation
     */
    logPaymentIntentStatusValidation(
        paymentIntentId: string, 
        status: string, 
        canSettle: boolean, 
        validationTime: number
    ): void {
        this.logger.log(`[METRICS] PaymentIntent validation: ${paymentIntentId} | Status: ${status} | Can settle: ${canSettle} | Duration: ${validationTime}ms`);
        
        // Track status distribution
        this.metrics.errorsByStatus.set(status, (this.metrics.errorsByStatus.get(status) || 0) + 1);
        
        if (!canSettle) {
            PaymentLogger.logPaymentEvent('auth', {
                transactionId: paymentIntentId,
                status: status,
                responseText: `Cannot settle - status: ${status}`
            });
        }
    }

    /**
     * Get current metrics summary
     */
    getMetricsSummary(): StripePaymentMetricsSummary {
        const now = Date.now();
        const uptimeHours = (now - this.metrics.lastReset) / (1000 * 60 * 60);
        
        return {
            timestamp: new Date().toISOString(),
            uptime: {
                hours: uptimeHours,
                since: new Date(this.metrics.lastReset).toISOString()
            },
            settlement: {
                attempts: this.metrics.settlementAttempts,
                successes: this.metrics.settlementSuccesses,
                failures: this.metrics.settlementFailures,
                duplicates: this.metrics.duplicateSettlements,
                successRate: this.getSuccessRate(),
                consecutiveFailures: this.metrics.consecutiveFailures
            },
            timing: {
                averageSettlementTime: this.getAverageSettlementTime(),
                minSettlementTime: this.metrics.minSettlementTime === Infinity ? 0 : this.metrics.minSettlementTime,
                maxSettlementTime: this.metrics.maxSettlementTime,
                averageApiTime: this.getAverageApiTime()
            },
            paymentIntents: {
                created: this.metrics.paymentIntentsCreated,
                linked: this.metrics.paymentIntentsLinked,
                settled: this.metrics.paymentIntentsSettled,
                failed: this.metrics.paymentIntentsFailed,
                linkRate: this.getLinkRate(),
                settlementRate: this.getSettlementRate()
            },
            api: {
                calls: this.metrics.stripeApiCalls,
                failures: this.metrics.stripeApiFailures,
                retries: this.metrics.stripeApiRetries,
                failureRate: this.getApiFailureRate(),
                retryRate: this.getApiRetryRate()
            },
            errors: {
                byType: Object.fromEntries(this.metrics.errorsByType),
                byStatus: Object.fromEntries(this.metrics.errorsByStatus),
                topErrorType: this.getTopErrorType(),
                topStatus: this.getTopStatus()
            }
        };
    }

    /**
     * Log comprehensive metrics summary
     */
    logMetricsSummary(): void {
        const summary = this.getMetricsSummary();
        
        this.logger.log(`[METRICS SUMMARY] 
📊 Settlement Performance:
  • Success Rate: ${summary.settlement.successRate.toFixed(2)}% (${summary.settlement.successes}/${summary.settlement.attempts})
  • Average Time: ${summary.timing.averageSettlementTime}ms
  • Consecutive Failures: ${summary.settlement.consecutiveFailures}
  
🔄 PaymentIntent Lifecycle:
  • Created: ${summary.paymentIntents.created}
  • Linked: ${summary.paymentIntents.linked} (${summary.paymentIntents.linkRate.toFixed(1)}%)
  • Settled: ${summary.paymentIntents.settled} (${summary.paymentIntents.settlementRate.toFixed(1)}%)
  
🌐 Stripe API Performance:
  • Calls: ${summary.api.calls}
  • Failure Rate: ${summary.api.failureRate.toFixed(2)}%
  • Retry Rate: ${summary.api.retryRate.toFixed(2)}%
  
⚠️ Top Issues:
  • Error Type: ${summary.errors.topErrorType || 'None'}
  • Status: ${summary.errors.topStatus || 'None'}
  
⏱️ Uptime: ${summary.uptime.hours.toFixed(1)} hours`);
    }

    /**
     * Reset metrics (useful for testing or periodic resets)
     */
    resetMetrics(): void {
        this.metrics = {
            settlementAttempts: 0,
            settlementSuccesses: 0,
            settlementFailures: 0,
            duplicateSettlements: 0,
            totalSettlementTime: 0,
            minSettlementTime: Infinity,
            maxSettlementTime: 0,
            stripeApiCalls: 0,
            stripeApiFailures: 0,
            stripeApiRetries: 0,
            totalApiTime: 0,
            paymentIntentsCreated: 0,
            paymentIntentsLinked: 0,
            paymentIntentsSettled: 0,
            paymentIntentsFailed: 0,
            errorsByType: new Map(),
            errorsByStatus: new Map(),
            lastReset: Date.now(),
            recentSettlementTimes: [],
            consecutiveFailures: 0,
            lastAlertTime: 0
        };
        
        this.logger.log('[METRICS] Metrics reset');
    }

    // Private helper methods

    private updateTimingMetrics(settlementTime: number): void {
        this.metrics.totalSettlementTime += settlementTime;
        this.metrics.minSettlementTime = Math.min(this.metrics.minSettlementTime, settlementTime);
        this.metrics.maxSettlementTime = Math.max(this.metrics.maxSettlementTime, settlementTime);
        
        // Keep recent times for rolling average
        this.metrics.recentSettlementTimes.push(settlementTime);
        if (this.metrics.recentSettlementTimes.length > this.MAX_RECENT_TIMES) {
            this.metrics.recentSettlementTimes.shift();
        }
    }

    private getSuccessRate(): number {
        if (this.metrics.settlementAttempts === 0) return 100;
        return (this.metrics.settlementSuccesses / this.metrics.settlementAttempts) * 100;
    }

    private getAverageSettlementTime(): number {
        if (this.metrics.recentSettlementTimes.length === 0) return 0;
        const sum = this.metrics.recentSettlementTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.metrics.recentSettlementTimes.length);
    }

    private getAverageApiTime(): number {
        if (this.metrics.stripeApiCalls === 0) return 0;
        return Math.round(this.metrics.totalApiTime / this.metrics.stripeApiCalls);
    }

    private getLinkRate(): number {
        if (this.metrics.paymentIntentsCreated === 0) return 0;
        return (this.metrics.paymentIntentsLinked / this.metrics.paymentIntentsCreated) * 100;
    }

    private getSettlementRate(): number {
        if (this.metrics.paymentIntentsLinked === 0) return 0;
        return (this.metrics.paymentIntentsSettled / this.metrics.paymentIntentsLinked) * 100;
    }

    private getApiFailureRate(): number {
        if (this.metrics.stripeApiCalls === 0) return 0;
        return (this.metrics.stripeApiFailures / this.metrics.stripeApiCalls) * 100;
    }

    private getApiRetryRate(): number {
        if (this.metrics.stripeApiCalls === 0) return 0;
        return (this.metrics.stripeApiRetries / this.metrics.stripeApiCalls) * 100;
    }

    private getTopErrorType(): string | null {
        if (this.metrics.errorsByType.size === 0) return null;
        return Array.from(this.metrics.errorsByType.entries())
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    private getTopStatus(): string | null {
        if (this.metrics.errorsByStatus.size === 0) return null;
        return Array.from(this.metrics.errorsByStatus.entries())
            .sort(([,a], [,b]) => b - a)[0][0];
    }

    private logSuccessRateMetrics(): void {
        const successRate = this.getSuccessRate();
        const avgTime = this.getAverageSettlementTime();
        
        this.logger.log(`[METRICS] Current performance: ${successRate.toFixed(1)}% success rate | ${avgTime}ms avg time | ${this.metrics.settlementAttempts} total attempts`);
    }

    private checkFailureAlerts(paymentIntentId: string, error: Error): void {
        const now = Date.now();
        
        // Alert on consecutive failures
        if (this.metrics.consecutiveFailures >= this.FAILURE_ALERT_THRESHOLD && 
            now - this.metrics.lastAlertTime > this.ALERT_COOLDOWN) {
            
            this.logger.error(`🚨 ALERT: ${this.metrics.consecutiveFailures} consecutive settlement failures! Latest: ${paymentIntentId} - ${error.message}`);
            
            PaymentLogger.logSuspiciousActivity(
                'consecutive_settlement_failures',
                `${this.metrics.consecutiveFailures} consecutive failures, latest: ${error.message}`,
                { transactionId: paymentIntentId },
                'high'
            );
            
            this.metrics.lastAlertTime = now;
        }
        
        // Alert on low success rate
        const successRate = this.getSuccessRate();
        if (this.metrics.settlementAttempts >= 10 && successRate < 80 && 
            now - this.metrics.lastAlertTime > this.ALERT_COOLDOWN) {
            
            this.logger.error(`🚨 ALERT: Low settlement success rate: ${successRate.toFixed(1)}% (${this.metrics.settlementSuccesses}/${this.metrics.settlementAttempts})`);
            
            PaymentLogger.logSuspiciousActivity(
                'low_settlement_success_rate',
                `Success rate dropped to ${successRate.toFixed(1)}%`,
                undefined,
                'medium'
            );
            
            this.metrics.lastAlertTime = now;
        }
    }

    /**
     * Log manual settlement by admin
     */
    logManualSettlement(
        paymentIntentId: string,
        orderId: string,
        paymentId: string,
        adminUserId: string,
        reason: string,
        forceSettle: boolean
    ): void {
        this.logger.log(`[METRICS] Manual settlement: PI=${paymentIntentId}, Order=${orderId}, Payment=${paymentId}, Admin=${adminUserId}, Force=${forceSettle}, Reason=${reason}`);
        
        PaymentLogger.logPaymentEvent('settle', {
            transactionId: paymentIntentId,
            orderId: orderId,
            status: 'manual_settlement',
            gatewayTransactionId: paymentId,
            customerReference: adminUserId
        });
    }

    /**
     * Log manual settlement failure
     */
    logManualSettlementFailure(
        paymentIntentId: string,
        adminUserId: string,
        reason: string,
        error: Error
    ): void {
        this.logger.error(`[METRICS] Manual settlement failed: PI=${paymentIntentId}, Admin=${adminUserId}, Reason=${reason}, Error=${error.message}`);
        
        PaymentLogger.logPaymentError('settlement', error, {
            transactionId: paymentIntentId
        }, {
            adminUserId: adminUserId,
            reason: reason,
            type: 'manual_settlement_failure'
        });
    }

    /**
     * Log payment cancellation
     */
    logPaymentCancellation(
        paymentIntentId: string,
        orderId: string | undefined,
        adminUserId: string,
        reason: string,
        stripeStatus?: string,
        orderState?: string
    ): void {
        this.logger.log(`[METRICS] Payment cancelled: PI=${paymentIntentId}, Order=${orderId}, Admin=${adminUserId}, Reason=${reason}, StripeStatus=${stripeStatus}, OrderState=${orderState}`);
        
        PaymentLogger.logPaymentEvent('cancel', {
            transactionId: paymentIntentId,
            orderId: orderId,
            status: 'cancelled',
            customerReference: adminUserId,
            responseText: reason
        });
    }

    /**
     * Log retry attempt
     */
    logRetryAttempt(
        context: string,
        paymentIntentId: string | undefined,
        attempt: number,
        error: Error
    ): void {
        this.logger.warn(`[METRICS] Retry attempt: Context=${context}, PI=${paymentIntentId}, Attempt=${attempt}, Error=${error.message}`);
    }

    /**
     * Log retry success
     */
    logRetrySuccess(
        context: string,
        paymentIntentId: string | undefined,
        finalAttempt: number
    ): void {
        this.logger.log(`[METRICS] Retry success: Context=${context}, PI=${paymentIntentId}, FinalAttempt=${finalAttempt}`);
    }

    /**
     * Log retry failure (all attempts exhausted)
     */
    logRetryFailure(
        context: string,
        paymentIntentId: string | undefined,
        totalAttempts: number,
        finalError: Error
    ): void {
        this.logger.error(`[METRICS] Retry failure: Context=${context}, PI=${paymentIntentId}, TotalAttempts=${totalAttempts}, FinalError=${finalError.message}`);
    }
}

/**
 * Interface for metrics summary
 */
export interface StripePaymentMetricsSummary {
    timestamp: string;
    uptime: {
        hours: number;
        since: string;
    };
    settlement: {
        attempts: number;
        successes: number;
        failures: number;
        duplicates: number;
        successRate: number;
        consecutiveFailures: number;
    };
    timing: {
        averageSettlementTime: number;
        minSettlementTime: number;
        maxSettlementTime: number;
        averageApiTime: number;
    };
    paymentIntents: {
        created: number;
        linked: number;
        settled: number;
        failed: number;
        linkRate: number;
        settlementRate: number;
    };
    api: {
        calls: number;
        failures: number;
        retries: number;
        failureRate: number;
        retryRate: number;
    };
    errors: {
        byType: Record<string, number>;
        byStatus: Record<string, number>;
        topErrorType: string | null;
        topStatus: string | null;
    };
}