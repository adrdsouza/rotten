# Payment Issue Investigation

**Name:** Gemini
**Date:** 2024-07-26T18:00:00Z

## Problem Description

The user reports that after a successful payment with Stripe, the payment is not being correctly associated with the order in the Vendure backend.

- Local cart converts to a Vendure order.
- Payment is settled in the Stripe dashboard.
- Frontend logs confirm successful payment.
- Frontend logs also indicate an error when adding the payment to the backend.

## Investigation

- **Frontend Error**: The frontend logs show a `500 Internal Server Error` with the message `Failed to add payment to order: Invalid request`.
- **Backend Error**: The backend logs (`pm2-store-error.log`) show the error `error.payment-method-not-found`.
- **Root Cause**: The `stripe-pre-order.plugin.ts` defines a `PaymentMethodHandler` with the code `'stripe'`. However, the `vendure-config.ts` also initializes the `StripePlugin` from `@vendure/payments-plugin`, which also uses the `'stripe'` code. This creates a conflict, causing the backend to reject the `addPaymentToOrder` mutation.

## Solution

The solution is to rename the payment method code in `stripe-pre-order.plugin.ts` to a unique value, such as `'stripe-pre-order'`. This will resolve the conflict and allow the correct payment handler to be used.