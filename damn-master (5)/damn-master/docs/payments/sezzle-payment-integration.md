# Sezzle Payment Integration for Vendure

## Overview
This document provides a comprehensive guide for integrating the Sezzle payment gateway with the Vendure e-commerce platform. It covers configuration, features, environment variables, implementation details, and troubleshooting.

---

## Features
- Supports Sezzle Direct API v2
- Secure handling of API credentials via environment variables
- Automatic payment capture (recommended, default)
- Refund support
- Comprehensive error handling and logging
- Sandbox (test) and production environments

---

## Environment Variables
Add the following to your `.env` file:

```env
# Sezzle Configuration
SEZZLE_MERCHANT_UUID=your_sezzle_merchant_uuid
SEZZLE_API_KEY=your_sezzle_api_key
SEZZLE_BASE_URL=https://sandbox.gateway.sezzle.com  # Use https://gateway.sezzle.com for production
SEZZLE_TIMEOUT_MS=10000  # API timeout in milliseconds
```

---

## Vendure Configuration
1. Ensure the Sezzle payment handler is imported and registered in `vendure-config.ts`:

```typescript
import { sezzlePaymentHandler } from './sezzle-payment';
...
paymentOptions: {
  paymentMethodHandlers: [
    ...
    sezzlePaymentHandler,
  ],
},
```

2. In the Vendure Admin UI, add a new Payment Method and select `sezzle-payment` as the handler. Configure options as desired:
   - **Test Mode**: Should be enabled for sandbox testing
   - **Auto Capture**: Should be enabled (default, recommended)
   - **Require Shipping Info**: Enable if you want to require shipping details before checkout

---

## Implementation Details
- **API Version**: Uses Sezzle Direct API v2
- **Intent**: The handler uses `CAPTURE` intent by default (auto-capture). If `autoCapture` is set to false, only authorization is performed (not recommended unless you plan to implement manual capture).
- **Security**: Credentials are never exposed in the UI or logs. All sensitive data is loaded from environment variables.
- **Logging**: Errors and important actions are logged for troubleshooting.

---

## Payment Flow
1. Customer selects Sezzle at checkout
2. Order is created via Sezzle API
3. Customer is redirected to Sezzle to complete payment
4. Upon completion, customer is redirected back to your storefront
5. Payment is captured automatically (if `autoCapture` is enabled)

---

## Refunds
- Refunds are processed via the Sezzle API using the Vendure admin UI
- Partial and full refunds are supported

---

## Testing
- Use Sezzle's sandbox environment and test credentials to verify integration
- Set `SEZZLE_BASE_URL` to `https://sandbox.gateway.sezzle.com` and enable Test Mode
- Use test cards and data as provided by Sezzle's documentation

---

## Troubleshooting
- **API Errors**: Check the logs for detailed error messages
- **Credential Issues**: Ensure all environment variables are set and correct
- **Redirect Problems**: Confirm your `STOREFRONT_URL` is set correctly in the environment
- **Refund Issues**: Ensure the order was originally paid using Sezzle

---

## Security Considerations
- Never expose your API key or merchant UUID in client-side code
- Always use environment variables for sensitive data

---

## References
- [Sezzle Direct API Documentation](https://docs.sezzle.com/docs/guides/direct/introduction)
- [Vendure Payment Handler Docs](https://www.vendure.io/docs/developer-guide/plugins/payment-handlers/)

---

## Changelog
- **v1.0.0**: Initial Sezzle integration for Vendure (auto-capture, refunds, sandbox support)

---

For further support, consult the Sezzle docs or your Vendure integrator.
