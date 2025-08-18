# Single-Step Checkout Implementation Test Plan

## Implementation Summary

### ✅ Backend Changes Completed
1. **New Stripe Pre-Order Plugin** (`backend/src/plugins/stripe-pre-order/`)
   - Creates PaymentIntent with manual confirmation before order creation
   - Provides GraphQL mutations for pre-order payment handling
   - Links PaymentIntent to order after creation

2. **Vendure Configuration Updated** (`backend/src/vendure-config.ts`)
   - Added StripePreOrderPlugin to plugin list
   - Plugin registered and available

### ✅ Frontend Changes Completed
1. **Enhanced Checkout Provider** (`frontend/src/providers/shop/checkout/checkout.ts`)
   - Added `createPreOrderStripePaymentIntentMutation()`
   - Added `linkPaymentIntentToOrderMutation()`
   - Added `calculateEstimatedTotalQuery()`

2. **Updated StripePayment Component** (`frontend/src/components/payment/StripePayment.tsx`)
   - Immediate PaymentIntent creation using estimated total
   - Parallel order creation + payment confirmation
   - Removed dependency on existing Vendure order

3. **Simplified Checkout Flow** (`frontend/src/routes/checkout/index.tsx`)
   - Removed 2-step process (shipping → payment)
   - Single unified step with payment form always visible
   - Removed "Proceed to Payment" button

## Test Scenarios

### Test 1: Payment Form Rendering
**Expected:** Payment form should render immediately on checkout page load
- ✅ PaymentIntent created with estimated total
- ✅ Stripe Elements mounted immediately
- ✅ No dependency on Vendure order creation

### Test 2: Form Validation
**Expected:** Place Order button disabled until all fields valid
- Customer details validation
- Address form validation
- Payment method validation

### Test 3: Single-Step Processing
**Expected:** Place Order triggers parallel operations
- Order creation from local cart
- Payment confirmation with Stripe
- PaymentIntent linking to created order
- Redirect to confirmation page

### Test 4: Error Handling
**Expected:** Graceful error recovery
- Payment failures don't leave dangling orders
- Form validation errors clearly displayed
- Network issues handled with retries

## Manual Testing Steps

1. **Start Services**
   ```bash
   cd backend && npm run dev
   cd frontend && npm run dev
   ```

2. **Add Items to Cart**
   - Navigate to /shop
   - Add products to cart
   - Verify local cart has items

3. **Navigate to Checkout**
   - Go to /checkout
   - Verify payment form renders immediately
   - Check browser console for PaymentIntent creation

4. **Fill Out Forms**
   - Complete customer information
   - Complete shipping address
   - Verify Place Order button becomes enabled

5. **Test Payment**
   - Use Stripe test card: 4242 4242 4242 4242
   - Click Place Order
   - Verify parallel processing works
   - Verify redirect to confirmation page

## Expected Behavior Changes

### Before (2-Step)
1. Fill customer/address info
2. Click "Proceed to Payment" 
3. Wait for order creation
4. Payment form renders
5. Click "Place Order"
6. Payment processing

### After (Single-Step)
1. Fill customer/address info
2. Payment form already visible
3. Click "Place Order" (enabled when valid)
4. Parallel: order creation + payment processing
5. Immediate redirect to confirmation

## Performance Benefits
- **Faster UX**: Payment form renders immediately
- **Parallel Processing**: Order + payment happen simultaneously
- **Reduced Steps**: Single action instead of two-step process
- **Better Error Handling**: Atomic operations with rollback capability