# NMI Payment Gateway Integration

This document outlines the implementation details and configuration of the NMI (Network Merchants, Inc.) payment gateway integration for the Rotten Hand e-commerce platform.

## Overview

The NMI payment integration allows the processing of credit card payments through the Network Merchants, Inc. payment gateway. This implementation is built as a custom payment method handler for the Vendure e-commerce framework.

## Features

- Secure credit card processing via NMI's API
- Support for both test and production environments
- AVS (Address Verification System) and CVV validation
- Support for payments, refunds, and voids
- Environment-based security key configuration
- Comprehensive error handling and logging

## Configuration

### Environment Variables

The following environment variables must be set in your `.env` file:

```env
# Required
NMI_SECURITY_KEY=your_nmi_security_key

# Optional
NMI_TIMEOUT_MS=10000  # API request timeout in milliseconds (default: 10000)
```

### Vendure Configuration

The payment method is registered in `vendure-config.ts`:

```typescript
import { nmiPaymentHandler } from './nmi-payment/nmi-payment-handler';

export const config: VendureConfig = {
  // ... other config
  paymentOptions: {
    paymentMethodHandlers: [
      nmiPaymentHandler,
    ],
  },
  // ... rest of config
};
```

## Implementation Details

### Security

- The NMI security key is **only** loaded from environment variables for enhanced security
- Sensitive data is never logged
- All transactions are processed over HTTPS
- AVS and CVV checks are enforced based on configuration

### Error Handling

The implementation includes comprehensive error handling for:
- Network timeouts
- Invalid payment data
- Declined transactions
- Configuration errors
- API communication failures

### Logging

All payment operations are logged with appropriate log levels:
- `INFO`: Successful operations
- `WARN`: Potentially problematic situations (e.g., AVS/CVV mismatches in non-strict mode)
- `ERROR`: Failed operations and exceptions

## Transaction Types

### Payment Processing
- **Type**: `sale`
- **Description**: Processes an immediate payment
- **Requirements**: Valid payment token, order ID, and amount

### Refund
- **Type**: `refund`
- **Description**: Processes a refund for a previous transaction
- **Requirements**: Original transaction ID and refund amount

### Void
- **Type**: `void`
- **Description**: Cancels an unsettled transaction
- **Requirements**: Original transaction ID

## Testing

### Test Mode
Set the `testMode` flag to `true` in the payment method configuration to enable test mode. In test mode:
- Transactions are processed against NMI's test environment
- No actual funds are transferred
- Test card numbers can be used

### Test Card Numbers
When in test mode, you can use the following test card numbers:
- `4111111111111111` - Visa (successful)
- `5431111111111111` - Mastercard (successful)
- `371111111111114` - American Express (successful)
- `30000000000004` - Diner's Club (successful)
- `6011000000000012` - Discover (successful)
- `4000111111111115` - Visa (declined)

## Troubleshooting

### Common Issues

1. **Invalid Security Key**
   - Ensure the `NMI_SECURITY_KEY` environment variable is set correctly
   - Verify the key has the correct permissions in the NMI dashboard

2. **Transaction Declined**
- Check the error message in the payment response
- Verify the card details and billing information
- Ensure the card has sufficient funds

3. **Timeout Errors**
- Check your network connection
- Verify the NMI API endpoint is accessible
- Consider increasing the `NMI_TIMEOUT_MS` value if needed

## Monitoring

Monitor the following in your production environment:
- Payment success/failure rates
- Average transaction processing time
- Error rates and types
- Available balance in your NMI merchant account

## Security Considerations

- Never commit the `NMI_SECURITY_KEY` to version control
- Regularly rotate your security keys
- Monitor for suspicious activity
- Keep the integration updated with the latest security patches

## Support

For issues with the NMI payment integration, contact:
- NMI Support: [support@nmi.com](mailto:support@nmi.com)
- Internal Development Team: [dev@rottenhand.com](mailto:dev@rottenhand.com)

## Changelog

### 1.0.0 (2025-05-29)
- Initial implementation of NMI payment handler
- Support for payments, refunds, and voids
- Environment-based configuration
- Comprehensive error handling and logging
