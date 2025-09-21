# Stripe Integration Summary

This document summarizes the Stripe integration in the Vendure application.

## Key Findings

- **No Official `@vendure/stripe-plugin`**: The official `@vendure/stripe-plugin` is not installed or used in this project. The `backend/package.json` file does not list it as a dependency, and no code files import or reference it.

- **Custom Stripe Implementation**: The project uses a custom Stripe implementation composed of two separate plugins found in `backend/src/plugins/`:
    1.  **`stripe-pre-order`**: This plugin handles pre-order payments. It introduces a mechanism to create a Stripe `PaymentIntent` *before* a Vendure order is created. It exposes custom GraphQL mutations to the storefront to manage this flow.
    2.  **`stripe-extension`**: This plugin enhances the payment data by capturing additional details from the Stripe payment method object (e.g., card brand, funding type, wallet). It also includes a webhook handler to process Stripe refund events and automatically update the order status in Vendure.

- **Configuration**: The main configuration file, `backend/src/vendure-config.ts`, confirms that both `StripePreOrderPlugin` and `StripeExtensionPlugin` are actively configured and used in the application.

- **Underlying Library**: The configuration also shows an import for `StripePlugin` from `@vendure/payments-plugin/package/stripe`. This indicates that the custom implementation is likely built upon the generic payments plugin provided by Vendure, using the core `stripe` Node.js library for communication with the Stripe API.

## Conclusion

The application relies on a bespoke Stripe integration tailored for a pre-order payment flow and enhanced refund processing, rather than using the standard, off-the-shelf Vendure Stripe plugin.