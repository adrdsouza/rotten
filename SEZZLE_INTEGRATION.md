# Sezzle Payment Integration

This document describes the Sezzle payment integration that has been added to the Vendure ecommerce project alongside the existing NMI payment integration.

## Overview

Sezzle is a "Buy Now, Pay Later" payment service that allows customers to split their purchases into 4 interest-free installments. This integration provides customers with an alternative payment method to traditional credit card processing.

## Backend Integration

### Sezzle Payment Handler

The Sezzle payment integration is implemented as a Vendure payment handler located at:
- `backend/src/sezzle-payment/sezzle-payment-handler.ts`
- `backend/src/sezzle-payment/index.ts`

#### Key Features:
- **Authentication**: Uses Bearer token authentication with Sezzle API
- **Session Creation**: Creates Sezzle payment sessions using the `/v2/session` endpoint
- **Automatic Token Management**: Handles token refresh automatically
- **Error Handling**: Comprehensive error handling and logging
- **Refund Support**: Full refund functionality

#### Configuration

The Sezzle payment handler is configured in `backend/src/vendure-config.ts`:

```typescript
paymentMethodHandlers: [sezzlePaymentHandler]
```

#### Environment Variables

Required environment variables in `backend/.env`:

```env
SEZZLE_MERCHANT_UUID=your_sezzle_public_key
SEZZLE_API_KEY=your_sezzle_private_key
SEZZLE_BASE_URL=https://sandbox.gateway.sezzle.com  # or production URL
SEZZLE_TIMEOUT_MS=10000

# Frontend URL for Sezzle payment redirects
FRONTEND_URL=http://localhost:3000  # Change this to your production frontend URL
```

## Frontend Integration

### Payment Component Structure

The frontend integration includes:

1. **Sezzle Component**: `frontend/src/components/payment/Sezzle.tsx`
   - Displays Sezzle branding and benefits
   - Handles payment initiation
   - Redirects to Sezzle checkout

2. **Updated Payment Component**: `frontend/src/components/payment/Payment.tsx`
   - Payment method selection UI
   - Supports both NMI and Sezzle options
   - Radio button interface for method selection

3. **Secure API Integration**: `frontend/src/utils/secure-api.ts`
   - reCAPTCHA protected payment processing
   - Secure Sezzle payment function

### Payment Flow

1. **Method Selection**: Customer chooses between Credit Card (NMI) or Sezzle using radio buttons
2. **Place Order**: Customer clicks the "Place Order" button (which changes to "Continue with Sezzle" when Sezzle is selected)
3. **Address Processing**: System processes shipping/billing addresses
4. **Payment Trigger**: System automatically triggers the selected payment method
5. **For Sezzle**: Backend creates Sezzle session and redirects customer to Sezzle checkout
6. **For NMI**: Customer enters card details and processes payment directly
7. **Sezzle Checkout**: Customer completes payment on Sezzle platform
8. **Return & Verification**: Customer returns to confirmation page, system automatically verifies payment status with Sezzle
9. **Payment Settlement**: If payment is confirmed, system updates payment status from "Authorized" to "Settled"

### UI Features

- **Payment Method Selection**: Clean radio button interface with visual payment method cards
- **Dynamic Place Order Button**: Changes text and styling based on selected payment method
  - Credit Card: "Place Order" with dark gradient
  - Sezzle: "Continue with Sezzle" with purple gradient
- **Sezzle Branding**: Purple gradient design matching Sezzle brand
- **Benefits Display**: Shows key Sezzle benefits (4 payments, 0% interest, no credit impact)
- **Error Handling**: User-friendly error messages
- **Loading States**: Visual feedback during processing

## API Integration Details

### Sezzle API Endpoints Used

1. **Authentication**: `POST /v2/authentication`
   - Exchanges public/private keys for Bearer token
   - Automatic token refresh when expired

2. **Session Creation**: `POST /v2/session`
   - Creates payment session with order details
   - Returns checkout URL for customer redirect

3. **Order Retrieval**: `GET /v2/order/{uuid}`
   - Fetches order status and details

4. **Order Status**: `GET /v2/order/{uuid}`
   - Verifies payment status after customer returns from Sezzle
   - Used for automatic payment settlement

5. **Order Capture**: `POST /v2/order/{uuid}/capture`
   - Captures authorized payments
   - Automatically called when payment verification succeeds

6. **Refunds**: `POST /v2/order/{uuid}/refund`
   - Processes refunds for completed orders

### Data Flow

```
Frontend → Secure API → Vendure → Sezzle Payment Handler → Sezzle API
```

### Payment Verification Flow

```
1. Customer returns from Sezzle → Confirmation Page loads
2. Frontend calls verifySezzlePayment mutation
3. Backend fetches payment status from Sezzle API
4. If payment confirmed → Backend settles payment
5. Payment status updated from "Authorized" → "Settled"
```

## Security Features

- **reCAPTCHA Protection**: All payment requests protected by reCAPTCHA v3
- **Token Management**: Secure token storage and automatic refresh
- **Input Validation**: Comprehensive validation of payment data
- **Error Sanitization**: Safe error message handling

## Testing

### Development Testing

1. **Environment Setup**: Use Sezzle sandbox credentials
2. **Payment Flow**: Test complete checkout process
3. **Error Scenarios**: Test various error conditions
4. **Refund Testing**: Verify refund functionality

### Production Deployment

1. **Credentials**: Update to production Sezzle credentials
2. **URL Configuration**: Change to production Sezzle API URL
3. **Testing**: Perform thorough testing in production environment

## Compatibility

- **Vendure Version**: Compatible with current Vendure setup
- **NMI Integration**: Does not interfere with existing NMI payment
- **Frontend Framework**: Qwik-based frontend
- **TypeScript**: Full TypeScript support

## Maintenance

### Monitoring

- Monitor Sezzle API response times
- Track payment success/failure rates
- Log authentication token refresh cycles

### Updates

- Keep Sezzle API integration up to date
- Monitor for API changes or deprecations
- Update error handling as needed

## Support

For Sezzle-specific issues:
- Sezzle Developer Documentation: https://docs.sezzle.com/
- Sezzle Support: Contact through merchant portal

For integration issues:
- Check logs in Vendure admin
- Verify environment variables
- Test API connectivity

## Files Modified/Created

### Backend
- `backend/src/sezzle-payment/sezzle-payment-handler.ts` (updated)
- `backend/src/sezzle-payment/index.ts` (existing)
- `backend/src/vendure-config.ts` (existing - Sezzle already configured)

### Frontend
- `frontend/src/components/payment/Sezzle.tsx` (new)
- `frontend/src/components/payment/Payment.tsx` (updated)
- `frontend/src/providers/shop/checkout/checkout.ts` (updated)
- `frontend/src/utils/secure-api.ts` (updated)
- `frontend/src/routes/checkout/index.tsx` (updated)

## Configuration Summary

The integration is now complete and ready for testing. Both NMI and Sezzle payment methods are available to customers, with a clean UI for method selection and secure processing for both options.
