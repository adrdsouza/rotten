# Implementation Plan

## Overview
This implementation plan fixes the payment settlement timing issue in the Stripe pre-order plugin by implementing frontend-triggered settlement with Stripe API verification instead of immediate settlement. This approach avoids webhook configuration issues while ensuring payments are only settled after Stripe confirms them.

## Tasks

- [x] 1. Remove immediate settlement from linkPaymentIntentToOrder






  - Remove any existing `addPaymentToOrder` calls from `linkPaymentIntentToOrder`
  - Ensure `linkPaymentIntentToOrder` only updates PaymentIntent metadata
  - Add logging to track when PaymentIntents are linked vs settled
  - _Requirements: 1.1, 1.2_

- [x] 2. Create payment settlement endpoint with Stripe API verification






  - Create new GraphQL mutation `settleStripePayment(paymentIntentId: String!)`
  - Implement Stripe API call to verify PaymentIntent status before settling
  - Add proper error handling for API failures and invalid payment states
  - Ensure idempotency to handle duplicate settlement requests
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
-


- [x] 3. Implement settlement logic with proper validation




  - Create settlement service that calls `addPaymentToOrder` after API verification
  - Add idempotency checks to prevent duplicate settlements
  - Implement proper error handling and logging for settlement operations
  - Add database transactions to ensure atomic settlement operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4_
-


- [x] 4. Add Stripe API integration for PaymentIntent verification






  - Implement Stripe API client for retrieving PaymentIntent status
  - Add retry logic with exponential backoff for API failures
  - Validate PaymentIntent belongs to the requesting order
  - Handle various PaymentIntent states (succeeded, failed, pending, etc.)
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 5. Update frontend to use new settlement flow









  - Modify payment confirmation to call `settleStripePayment` after Stripe confirmation
  - Remove any existing immediate settlement calls
  - Add proper error handling and user feedback for settlement failures
  - Implement retry mechanism for failed settlement attempts
  - _Requirements: 3.1, 3.2, 3.3, 3.4_




- [x] 6. Add comprehensive logging and monitoring







  - Log all settlement attempts and their outcomes
  - Track PaymentIntent lifecycle from creation through settlement

  - Add metrics for settlement success rates and timing
  - Implement alerting for failed settlement operations
  - _Requirements: 5.4, 6.1, 6.2, 6.3_

- [x] 7. Implement proper error handling and user feedback



  - Create user-friendly error messages for different failure scenarios
  - Add retry mechanisms for transient failures
  - Implement proper order state management for failed payments
  - Add admin tools for manual payment resolution if needed
  - _Requirements: 2.4, 3.4, 6.1, 6.2, 6.3_


- [x] 8. Test the complete payment flow









  - Test successful payment: PaymentIntent creation → linking → Stripe confirmation → API verification → settlement
  - Test failed payment: Ensure orders stay in ArrangingPayment when Stripe payment fails
  - Test API failures: Verify proper error handling and retry mechanisms
  - Test concurrent settlements: Ensure idempotency works correctly
  - _Requirements: 1.1, 2.1, 3.1, 5.1_
-

- [ ] 9. Update documentation and remove webhook dependencies


  - Document the new settlement flow and API requirements
  - Update plugin documentation to reflect API-based verification
  - Create troubleshooting guide for settlement issues
  - Remove any webhook-related configuration documentation
  - _Requirements: 2.1, 2.4, 6.4_