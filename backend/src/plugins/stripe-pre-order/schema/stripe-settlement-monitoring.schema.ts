import { gql } from 'apollo-server-express';

export const stripeSettlementMonitoringSchema = gql`
    type StripeSettlementStats {
        attempts: Int!
        successes: Int!
        failures: Int!
        successRate: Float!
        consecutiveFailures: Int!
        averageTimeMs: Float!
    }

    type StripeApiVerificationStats {
        attempts: Int!
        successes: Int!
        failures: Int!
        successRate: Float!
    }

    type StripeSettlementAlerts {
        highErrorRate: Boolean!
        consecutiveFailures: Boolean!
        slowSettlement: Boolean!
    }

    type StripeSettlementMetrics {
        settlementStats: StripeSettlementStats!
        apiVerificationStats: StripeApiVerificationStats!
        alerts: StripeSettlementAlerts!
        lastResetTime: String!
    }

    type StripeSettlementDailyStats {
        date: String!
        attempts: Int!
        successes: Int!
        failures: Int!
        successRate: Float!
        averageTimeMs: Float!
    }

    type StripeSettlementDatabaseStats {
        totalPendingPayments: Int!
        pendingByStatus: String! # JSON string of status counts
        oldestPendingPayment: String # ISO date string or null
        paymentsLast24Hours: Int!
    }

    type StripeSettlementHealthReport {
        status: String! # 'healthy' | 'warning' | 'critical'
        summary: String!
        details: String! # JSON string of detailed metrics
        recommendations: [String!]!
        timestamp: String!
    }

    type StripeSettlementMetricsReset {
        success: Boolean!
        message: String!
        resetTime: String!
    }

    type StripeSettlementSummaryPeriod {
        start: String!
        end: String!
    }

    type StripeSettlementSummaryStats {
        totalAttempts: Int!
        successfulSettlements: Int!
        failedSettlements: Int!
        successRate: Float!
        averageDurationMs: Float!
    }

    type StripeSettlementSummaryReport {
        period: StripeSettlementSummaryPeriod!
        summary: StripeSettlementSummaryStats!
        errorBreakdown: String! # JSON string of error categories
        recommendations: [String!]!
    }

    extend type Query {
        """
        Get current Stripe settlement metrics summary
        Requires SuperAdmin permission
        """
        stripeSettlementMetrics: StripeSettlementMetrics!

        """
        Get daily settlement statistics for a specific date
        Requires SuperAdmin permission
        """
        stripeSettlementDailyStats(date: String): StripeSettlementDailyStats

        """
        Get database statistics for pending Stripe payments
        Requires SuperAdmin permission
        """
        stripeSettlementDatabaseStats: StripeSettlementDatabaseStats!

        """
        Generate comprehensive health report for Stripe settlement system
        Requires SuperAdmin permission
        """
        stripeSettlementHealthReport: StripeSettlementHealthReport!

        """
        Reset Stripe settlement metrics (for testing or maintenance)
        Requires SuperAdmin permission
        """
        resetStripeSettlementMetrics: StripeSettlementMetricsReset!

        """
        Generate settlement summary report for a date range
        Requires SuperAdmin permission
        """
        stripeSettlementSummaryReport(
            startDate: String!
            endDate: String!
        ): StripeSettlementSummaryReport!
    }
`;