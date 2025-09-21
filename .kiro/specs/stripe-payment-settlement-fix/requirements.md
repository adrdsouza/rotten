# Requirements Document

## Introduction

The current Stripe pre-order plugin has a critical payment settlement timing issue where orders are marked as "PaymentSettled" immediately after linking a PaymentIntent to an order, before Stripe has confirmed the payment. Since this is the only Stripe payment system used on the site, the plugin needs to be fixed to handle the complete payment lifecycle properly - only settling payments after receiving confirmation from Stripe through webhooks.

## Requirements

### Requirement 1: Conditional Payment Settlement

**User Story:** As a system administrator, I want orders to only be marked as settled after Stripe confirms the payment, so that cancelled or failed payments don't show as completed orders.

#### Acceptance Criteria

1. WHEN a PaymentIntent is linked to an order THEN the system SHALL NOT automatically call addPaymentToOrder
2. WHEN Stripe confirms a payment through webhooks THEN the system SHALL transition the order to PaymentSettled
3. WHEN a payment is cancelled or fails THEN the order SHALL remain in ArrangingPayment state
4. WHEN a payment fails after multiple attempts THEN the order SHALL transition to PaymentDeclined state

### Requirement 2: Frontend-Triggered Payment Confirmation with API Verification

**User Story:** As a system administrator, I want to use direct Stripe API verification to confirm payments after frontend confirmation, so that payment settlement is reliable without depending on webhook delivery.

#### Acceptance Criteria

1. WHEN frontend receives successful payment confirmation from Stripe THEN it SHALL call a backend settlement endpoint
2. WHEN the backend settlement endpoint is called THEN it SHALL verify the PaymentIntent status directly with Stripe API
3. WHEN Stripe API confirms the payment is succeeded THEN the system SHALL call addPaymentToOrder to settle the payment
4. WHEN Stripe API shows payment failed or pending THEN the system SHALL reject settlement and return appropriate error

### Requirement 3: Reliable Payment State Management

**User Story:** As a customer, I want my payment to be processed reliably and immediately after I complete it, so that I can see my order status updated quickly.

#### Acceptance Criteria

1. WHEN frontend confirms payment with Stripe THEN it SHALL immediately call the backend settlement endpoint
2. WHEN the backend verifies payment success with Stripe API THEN it SHALL settle the payment and return success to frontend
3. WHEN a PaymentIntent is already settled THEN duplicate settlement requests SHALL be ignored gracefully and return success
4. WHEN payment verification fails THEN the system SHALL provide clear error messages to help customer retry

### Requirement 4: Conditional Payment Settlement

**User Story:** As a system administrator, I want pre-order payments to only be settled after Stripe confirms them, so that cancelled or failed payments don't show as completed orders.

#### Acceptance Criteria

1. WHEN a PaymentIntent is linked to an order THEN the system SHALL NOT automatically call addPaymentToOrder
2. WHEN Stripe confirms a pre-order payment through webhooks THEN the pre-order plugin SHALL settle the payment
3. WHEN a pre-order payment is cancelled or fails THEN the order SHALL remain in ArrangingPayment state
4. WHEN payment settlement occurs THEN it SHALL be handled exclusively by the pre-order plugin for pre-order payments

### Requirement 5: Idempotent Payment Processing

**User Story:** As a system administrator, I want payment processing to be idempotent, so that duplicate webhook calls don't create multiple payment records.

#### Acceptance Criteria

1. WHEN multiple settlement requests are received for the same pre-order PaymentIntent THEN only the first SHALL be processed
2. WHEN a pre-order PaymentIntent is already settled THEN subsequent settlement attempts SHALL return success without changes
3. WHEN concurrent settlement requests occur THEN database transactions SHALL prevent race conditions
4. WHEN settlement fails due to order state issues THEN the system SHALL provide clear error messages

### Requirement 6: Error Handling and Recovery

**User Story:** As a system administrator, I want robust error handling for payment processing, so that temporary failures don't result in lost payments or stuck orders.

#### Acceptance Criteria

1. WHEN webhook processing fails due to temporary issues THEN the system SHALL log the error for manual review
2. WHEN PaymentIntent verification with Stripe fails THEN the system SHALL retry with exponential backoff
3. WHEN order state transitions fail THEN the system SHALL log detailed error information
4. WHEN payment settlement fails THEN the system SHALL provide actionable error messages for support teams