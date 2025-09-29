import gql from 'graphql-tag';

export const stripeAdminSchema = gql`
  type AdminPaymentInfo {
    paymentIntentId: String!
    orderCode: String!
    amount: Int!
    currency: String!
    status: String!
    stripeStatus: String
    createdAt: DateTime!
    settledAt: DateTime
    failedAt: DateTime
    failureReason: String
    failureType: String
    isRetryable: Boolean
    retryCount: Int
    orderState: String
    canManualSettle: Boolean!
    canRetry: Boolean!
  }

  type PaymentSearchResult {
    payments: [AdminPaymentInfo!]!
    total: Int!
    hasMore: Boolean!
  }

  type PaymentStatistics {
    totalPayments: Int!
    successfulPayments: Int!
    failedPayments: Int!
    pendingPayments: Int!
    retryableFailures: Int!
    manualSettlements: Int!
    totalAmount: Float!
    averageAmount: Float!
  }

  type ManualSettlementResult {
    success: Boolean!
    paymentId: String
    orderCode: String
    error: String
    warnings: [String!]
  }

  extend type Query {
    """
    Search Stripe payments with filters (Admin only)
    """
    searchStripePayments(
      status: String
      orderCode: String
      paymentIntentId: String
      dateFrom: String
      dateTo: String
      isRetryable: Boolean
      limit: Int
      offset: Int
    ): PaymentSearchResult!

    """
    Get detailed information about a specific Stripe payment (Admin only)
    """
    getStripePaymentDetails(paymentIntentId: String!): AdminPaymentInfo

    """
    Get Stripe payment statistics for admin dashboard (Admin only)
    """
    getStripePaymentStatistics(days: Int): PaymentStatistics!
  }

  extend type Mutation {
    """
    Manually settle a Stripe payment (Admin only - use with caution)
    """
    manuallySettleStripePayment(
      paymentIntentId: String!
      bypassValidation: Boolean
    ): ManualSettlementResult!

    """
    Retry a failed Stripe payment settlement (Admin only)
    """
    retryStripePaymentSettlement(paymentIntentId: String!): ManualSettlementResult!

    """
    Cancel a Stripe payment (Admin only)
    """
    cancelStripePayment(
      paymentIntentId: String!
      reason: String!
    ): ManualSettlementResult!
  }
`;