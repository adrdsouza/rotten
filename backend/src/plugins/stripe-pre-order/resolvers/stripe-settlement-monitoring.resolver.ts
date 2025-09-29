import { Resolver, Query, Args } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { StripeSettlementMetricsService } from '../services/stripe-settlement-metrics.service';
import { StripeSettlementLoggerService } from '../services/stripe-settlement-logger.service';

/**
 * GraphQL resolver for Stripe settlement monitoring and metrics
 * Provides endpoints for administrators to monitor payment settlement health
 */
@Resolver()
export class StripeSettlementMonitoringResolver {
    constructor(
        private metricsService: StripeSettlementMetricsService,
        private loggerService: StripeSettlementLoggerService
    ) {}

    /**
     * Get current settlement metrics summary
     * Requires admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async stripeSettlementMetrics(@Ctx() ctx: RequestContext): Promise<{
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
        lastResetTime: string;
    }> {
        const metrics = this.metricsService.getMetricsSummary();
        
        return {
            settlementStats: metrics.settlementStats,
            apiVerificationStats: metrics.apiVerificationStats,
            alerts: metrics.alerts,
            lastResetTime: metrics.lastResetTime.toISOString()
        };
    }

    /**
     * Get daily settlement statistics
     * Requires admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async stripeSettlementDailyStats(
        @Args('date', { nullable: true }) date?: string,
        @Ctx() ctx?: RequestContext
    ): Promise<{
        date: string;
        attempts: number;
        successes: number;
        failures: number;
        successRate: number;
        averageTimeMs: number;
    } | null> {
        return this.metricsService.getDailyStats(date);
    }

    /**
     * Get database statistics for pending payments
     * Requires admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async stripeSettlementDatabaseStats(@Ctx() ctx: RequestContext): Promise<{
        totalPendingPayments: number;
        pendingByStatus: string; // JSON string of status counts
        oldestPendingPayment: string | null;
        paymentsLast24Hours: number;
    }> {
        const stats = await this.metricsService.getDatabaseStats();
        
        return {
            totalPendingPayments: stats.totalPendingPayments,
            pendingByStatus: JSON.stringify(stats.pendingByStatus),
            oldestPendingPayment: stats.oldestPendingPayment?.toISOString() || null,
            paymentsLast24Hours: stats.paymentsLast24Hours
        };
    }

    /**
     * Generate comprehensive health report
     * Requires admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async stripeSettlementHealthReport(@Ctx() ctx: RequestContext): Promise<{
        status: string;
        summary: string;
        details: string; // JSON string of detailed metrics
        recommendations: string[]; // Array of recommendation strings
        timestamp: string;
    }> {
        const report = await this.metricsService.generateHealthReport();
        
        return {
            status: report.status,
            summary: report.summary,
            details: JSON.stringify(report.details),
            recommendations: report.recommendations,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reset metrics (for testing or maintenance)
     * Requires super admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async resetStripeSettlementMetrics(@Ctx() ctx: RequestContext): Promise<{
        success: boolean;
        message: string;
        resetTime: string;
    }> {
        try {
            this.metricsService.resetMetrics();
            
            return {
                success: true,
                message: 'Stripe settlement metrics have been reset successfully',
                resetTime: new Date().toISOString()
            };
        } catch (error) {
            return {
                success: false,
                message: `Failed to reset metrics: ${error instanceof Error ? error.message : String(error)}`,
                resetTime: new Date().toISOString()
            };
        }
    }

    /**
     * Generate settlement summary report for a date range
     * Requires admin permissions
     */
    @Query()
    @Allow(Permission.SuperAdmin)
    async stripeSettlementSummaryReport(
        @Args('startDate') startDate: string,
        @Args('endDate') endDate: string,
        @Ctx() ctx?: RequestContext
    ): Promise<{
        period: {
            start: string;
            end: string;
        };
        summary: {
            totalAttempts: number;
            successfulSettlements: number;
            failedSettlements: number;
            successRate: number;
            averageDurationMs: number;
        };
        errorBreakdown: string; // JSON string of error categories
        recommendations: string[];
    }> {
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const report = await this.loggerService.generateSettlementSummary(start, end);
        
        return {
            period: {
                start: report.period.start.toISOString(),
                end: report.period.end.toISOString()
            },
            summary: report.summary,
            errorBreakdown: JSON.stringify(report.errorBreakdown),
            recommendations: report.recommendations
        };
    }
}