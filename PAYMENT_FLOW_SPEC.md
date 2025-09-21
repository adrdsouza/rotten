# Payment Flow Specification

This document outlines the backend and frontend changes for the Stripe payment integration, and defines the correct payment flow.

## 1. Backend Changes (Completed)

-   **Removed `linkPaymentIntentToOrderMutation`**: The `linkPaymentIntentToOrder` GraphQL mutation has been removed from the backend. This was part of an outdated payment integration and was causing failures.
-   **Using `addPaymentToOrder`**: The standard `addPaymentToOrder` mutation is now used to associate a payment with an order. This is the correct, current approach.

## 2. Frontend Changes (To Be Implemented)

The frontend logic will be updated to follow the correct Stripe payment confirmation flow. The key principle is that we only associate the payment with the Vendure order *after* Stripe has successfully confirmed the payment.

The current implementation incorrectly calls `addPaymentToOrder` *before* Stripe confirmation, which could lead to orders being marked as paid even if the payment fails.

### Correct Payment Flow:

The payment process is handled in two main parts: initiating the payment on the checkout page, and handling the result on the confirmation page.

**Part A: Initiating Payment (`StripePayment.tsx`)**

1.  **User Clicks "Pay"**: The `confirmStripePreOrderPayment` function is triggered.
2.  **Confirm with Stripe**: The function will now **first** call `stripe.confirmPayment()`.
    -   This method handles any necessary user interaction, such as 3D Secure authentication, by redirecting the user if needed.
    -   The `return_url` is set to the order confirmation page (`/checkout/confirmation/...`).
3.  **Handle Confirmation Result**:
    -   **If Redirect Occurs**: The browser navigates away. The rest of the logic is handled on the confirmation page (see Part B).
    -   **If No Redirect Occurs**: `stripe.confirmPayment()` returns a result directly.
        -   If `result.error`: Display the error to the user. The order is not placed.
        -   If `result.paymentIntent.status === 'succeeded'`: The payment was successful. Now, and only now, we call the `addPaymentToOrder` mutation to link the successful payment to the order. After this, we programmatically navigate the user to the confirmation page.

**Part B: Handling Redirect (`routes/checkout/confirmation/[code]/index.tsx`)**

1.  **User Returns to Site**: After completing the action with their bank, the user is redirected back to the `return_url`. The URL will contain `payment_intent` and `payment_intent_client_secret` query parameters.
2.  **Verify Payment Intent**: The confirmation page component will:
    a. Use the `payment_intent` from the URL to retrieve the PaymentIntent object from Stripe using `stripe.retrievePaymentIntent()`. This is a crucial security step to verify the payment status.
    b. Check if the `paymentIntent.status` is `'succeeded'`.
3.  **Add Payment to Order**:
    -   If the status is `'succeeded'`, the component will call the `addPaymentToOrder` mutation, passing the payment method and the PaymentIntent ID in the metadata.
    -   This action transitions the order state on the backend to `PaymentSettled`.
4.  **Display Confirmation**: The page then displays the final order confirmation details to the user.

## Summary of Changes

-   **`StripePayment.tsx`**: The `confirmStripePreOrderPayment` function will be refactored to call `stripe.confirmPayment()` *before* `addPaymentToOrder`. It will handle the non-redirect success case.
-   **`routes/checkout/confirmation/[code]/index.tsx`**: This component will be updated to handle the redirect case, verify the PaymentIntent status, and call `addPaymentToOrder`.

This revised flow ensures that the Vendure order is only updated after a payment is irrevocably confirmed by Stripe, preventing issues with failed payments.