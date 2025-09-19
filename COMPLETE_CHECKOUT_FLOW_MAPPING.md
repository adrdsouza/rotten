# Complete Checkout Flow Mapping

## Overview
This document maps out every step from when a customer hits "Proceed to Checkout" until the order confirmation screen is shown, including all queries, actions, mutations, and state transitions.

## Flow Architecture Summary
- **Cart Mode**: Local Cart (localStorage) → Convert to Vendure Order → Stripe Payment → Order Confirmation
- **Payment Method**: Stripe Payment Intents with pre-order creation
- **Backend**: Vendure GraphQL API with custom Stripe plugin
- **Order States**: Draft → ArrangingPayment → PaymentSettled → Delivered

---

## Step-by-Step Checkout Flow

### 1. Cart: "Proceed to Checkout" Button Click
**File**: `/frontend/src/components/cart/Cart.tsx` (lines 565-584)

**Trigger**: User clicks "Proceed to Checkout" button

**Validations Before Checkout**:
- Cart not empty: `localCart.localCart.items.length > 0`
- Shipping method selected: `shippingState.selectedMethod`
- Country selected: `appState.shippingAddress.countryCode`
- No out-of-stock items: `!isOutOfStock.value`

**Actions**:
1. Set navigation loading state: `isNavigatingToCheckout.value = true`
2. Validate cart data (items, shipping method, country)
3. Navigate to checkout page: `navigate('/checkout/')`

**No Backend Calls**: All data managed in localStorage until final order placement

---

### 2. Checkout Page Load & Initialization
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 121-172)

**Component**: `CheckoutContent`

**Initial State Setup**:
```typescript
const state = useStore<CheckoutState>({
  loading: false,
  error: null,
});
const pageLoading = useSignal(true);
const isOrderProcessing = useSignal(false);
const showProcessingModal = useSignal(false);
```

**Page Load Actions (`useVisibleTask$`)**:
1. **Initialize Validation System**:
   - `clearAllValidationCache()`
   - `resetCacheMonitoring()`
   - `enablePerformanceLogging()`
   - `enableAutoCleanup()`

2. **Load Stripe Configuration**:
   - **Query**: `getStripePublishableKeyQuery()`
   - **Result**: Store in `stripePublishableKey.value`

3. **Load Cart Data**:
   - **Action**: `loadCartIfNeeded(localCart)`
   - **Purpose**: Ensure cart data is available

4. **Refresh Stock Levels**:
   - **Action**: `refreshCartStock(localCart)`
   - **Validation**: `LocalCartService.validateStock()`
   - **Update State**: `validationActions.updateStockValidation()`

5. **Set Page Ready**: `pageLoading.value = false`

**Key State Changes**:
- Hide cart overlay: `appState.showCart = false`
- Initialize checkout validation context
- Load and validate cart stock levels

---

### 3. Checkout Form Rendering & Address Entry
**Files**: 
- `/frontend/src/components/checkout/CheckoutAddresses.tsx`
- `/frontend/src/components/checkout/StripePaymentForm.tsx`

**Components Rendered**:
1. **Order Summary** (left column):
   - `<CartContents />` - displays cart items
   - `<CartTotals />` - displays pricing breakdown

2. **Checkout Form** (right column):
   - `<CheckoutAddresses />` - customer info & addresses
   - `<StripePaymentForm />` - payment form
   - Terms & conditions checkbox
   - "Place Order" button

**Stripe Payment Form Initialization**:
1. **Payment Intent Creation**:
   - **Mutation**: `createPreOrderStripePaymentIntent`
   - **Parameters**: `estimatedTotal`, `currency`
   - **Result**: `paymentIntentId`, `clientSecret`

2. **Stripe Elements Setup**:
   - Initialize Stripe with publishable key
   - Create payment elements with client secret
   - Set up form validation

**Address Form State**:
- Customer information (email, name, phone)
- Shipping address (street, city, province, postal code, country)
- Billing address (if different from shipping)

---

### 4. "Place Order" Button Click
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 196-374)

**Function**: `_placeOrder`

**Pre-validation**:
- Order not already processing: `!isOrderProcessing.value`
- All required fields completed
- Terms & conditions accepted: `checkoutValidation.isAllValid`

**Step 4.1: Stripe Payment Form Validation**:
```typescript
// Validate Stripe payment form
if (typeof window !== 'undefined' && (window as any).submitStripeElements) {
  await (window as any).submitStripeElements();
}
```

**Step 4.2: Set Processing State**:
```typescript
showProcessingModal.value = true;
isOrderProcessing.value = true;
orderError.value = '';
state.error = null;
```

**Step 4.3: Final Validation**:
- Customer info: email, firstName, lastName
- Shipping address: streetLine1, city, province, postalCode, countryCode
- Billing address (if different billing enabled)

---

### 5. Local Cart to Vendure Order Conversion
**File**: `/frontend/src/contexts/CartContext.tsx` (lines 274-311)

**Function**: `convertLocalCartToVendureOrder`

**Process**:
1. **Stock Validation**:
   - **Action**: `LocalCartService.validateStock()`
   - **Check**: Verify all items still in stock
   - **Fail Case**: Return null if validation fails

2. **Extract Applied Coupon**:
   ```typescript
   const appliedCoupon = cartState.appliedCoupon ? { code: cartState.appliedCoupon.code } : null;
   ```

3. **Convert to Vendure Order**:
   - **Action**: `LocalCartService.convertToVendureOrder(appliedCoupon)`
   - **Backend Mutations Called**:
     - `setCustomerForOrder` (customer info)
     - `addItemToOrder` (for each cart item)
     - `applyCouponCode` (if coupon applied)
     - `setOrderShippingAddress`
     - `setOrderBillingAddress` (if different)

4. **State Transition**:
   ```typescript
   if (order) {
     cartState.isLocalMode = false;  // Switch to Vendure mode
     cartState.lastStockValidation = {};
     cartState.appliedCoupon = null;
   }
   ```

**Result**: Vendure Order object with state "Draft"

---

### 6. Address Submission
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 253-282)

**Process**:
1. **Submit Address Form**:
   ```typescript
   if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
     await (window as any).submitCheckoutAddressForm();
   }
   ```

2. **Wait for Completion**:
   - Poll `addressState.addressSubmissionComplete`
   - Maximum wait time: 10 seconds
   - Check interval: 100ms

**Backend Mutations**:
- `setOrderShippingAddress`
- `setOrderBillingAddress` (if different billing)

---

### 7. Shipping Method Selection
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 284-320)

**Logic**:
```typescript
if (appState.shippingAddress.countryCode && appState.activeOrder) {
  const countryCode = appState.shippingAddress.countryCode;
  const subTotal = appState.activeOrder?.subTotal || 0;
  
  // Determine shipping method ID
  if (countryCode === 'US' || countryCode === 'PR') {
    shippingMethodId = subTotal >= 10000 ? '6' : '3';  // Free vs $8 shipping
  } else {
    shippingMethodId = '7';  // International $20
  }
}
```

**Backend Mutation**:
- **Mutation**: `setOrderShippingMethodMutation([shippingMethodId])`
- **Result**: Updated order with shipping costs

---

### 8. Order State Transition to ArrangingPayment
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 322-335)

**Backend Mutation**:
```typescript
const { transitionOrderToStateMutation } = await import('~/providers/shop/checkout/checkout');
const transitionResult = await transitionOrderToStateMutation('ArrangingPayment');
```

**Purpose**: Prepare order for payment processing
**Order State**: Draft → ArrangingPayment

---

### 9. Get Latest Order & Trigger Payment
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 337-363)

**Process**:
1. **Refresh Order Data**:
   - **Query**: `getActiveOrderQuery()`
   - **Purpose**: Get latest order state with shipping/billing info

2. **Verify Order State**:
   - Check: `latestOrder.state === 'ArrangingPayment'`
   - Store: `appState.activeOrder = latestOrder`

3. **Trigger Stripe Payment**:
   ```typescript
   if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
     await (window as any).confirmStripePreOrderPayment(appState.activeOrder);
   }
   ```

---

### 10. Stripe Payment Confirmation
**File**: `/frontend/src/components/checkout/StripePaymentForm.tsx` (lines 214-244)

**Function**: `confirmStripePreOrderPayment`

**Process**:
1. **Store Order Info for Confirmation Page**:
   ```typescript
   sessionStorage.setItem('pendingOrderCode', order.code);
   sessionStorage.setItem('pendingOrderId', order.id);
   ```

2. **Complete Stripe Payment**:
   - **Action**: `payment.completePayment(order.id, order.code)`
   - **Stripe API**: `stripe.confirmPayment()`
   - **Parameters**: 
     ```typescript
     {
       elements: state.elements,
       confirmParams: {
         return_url: `${window.location.origin}/checkout/confirmation/${orderCode}`
       }
     }
     ```

**Payment Flow Details** (from `/frontend/src/hooks/useStripePayment.ts`):

1. **Stripe Confirmation**:
   ```typescript
   const result = await state.stripe.confirmPayment({
     elements: state.elements,
     confirmParams: {
       return_url: orderCode ? `${window.location.origin}/checkout/confirmation/${orderCode}` 
                             : `${window.location.origin}/checkout/confirmation`,
     },
   });
   ```

2. **Error Handling**:
   - If `result.error`: Report failure to backend via `confirmStripePaymentFailureMutation`
   - If payment status ≠ 'succeeded': Report status failure

3. **Success Handling**:
   ```typescript
   // Settle payment with backend
   const { settleStripePaymentMutation } = await import('~/providers/shop/checkout/checkout');
   const settlementResult = await settleStripePaymentMutation(state.paymentIntentId);
   ```

**Backend Settlement Mutation**:
```graphql
mutation settleStripePayment($paymentIntentId: String!) {
  settleStripePayment(paymentIntentId: $paymentIntentId) {
    success
    orderId
    orderCode
    paymentId
    error
  }
}
```

---

### 11. Stripe Redirect to Confirmation
**Flow**: Stripe redirects to confirmation URL with payment result

**URL Format**: `/checkout/confirmation/${orderCode}?payment_intent=pi_xxx&redirect_status=succeeded`

**Two Confirmation Routes**:

#### 11A. Generic Confirmation Handler
**File**: `/frontend/src/routes/checkout/confirmation/index.tsx`

**Purpose**: Handle Stripe redirects and find the order

**Process**:
1. **Extract URL Parameters**:
   ```typescript
   const paymentIntent = urlParams.get('payment_intent');
   const redirectStatus = urlParams.get('redirect_status');
   ```

2. **Validate Payment Status**:
   - Check: `redirectStatus === 'succeeded'`
   - Error if not successful

3. **Attempt Backend Settlement**:
   ```typescript
   const { settleStripePaymentMutation } = await import('~/providers/shop/checkout/checkout');
   const settlementResult = await settleStripePaymentMutation(paymentIntent);
   ```

4. **Success Redirect**:
   ```typescript
   if (settlementResult && settlementResult.success) {
     navigate(`/checkout/confirmation/${settlementResult.orderCode}`);
   }
   ```

5. **Fallback Polling** (if settlement fails):
   - Check sessionStorage for `pendingOrderCode`
   - Poll order status for up to 30 seconds
   - Look for order state: `PaymentSettled`

#### 11B. Order-Specific Confirmation
**File**: `/frontend/src/routes/checkout/confirmation/[code]/index.tsx`

**Purpose**: Display final order confirmation

**Process**:
1. **Load Order by Code**:
   - **Query**: `getOrderByCodeQuery(code)`
   - **Purpose**: Get complete order details

2. **Clear Application State**:
   ```typescript
   // Reset active order
   appState.activeOrder = {
     id: '', code: '', lines: [], state: 'Completed',
     totalWithTax: 0, subTotal: 0, shippingLines: [], payments: []
   };
   
   // Clear local cart
   clearLocalCartOnSuccess(localCart);
   ```

3. **Display Order Confirmation**:
   - Order summary with items and totals
   - Customer information
   - Shipping address
   - Billing address (if different)
   - Shipping method
   - Payment method details

---

## Order State Transitions

```
Local Cart (localStorage) 
    ↓ [Place Order]
Draft Order (Vendure)
    ↓ [Address & Shipping Setup]
ArrangingPayment (Vendure)
    ↓ [Stripe Payment Success]
PaymentSettled (Vendure)
    ↓ [Admin Processing]
Shipped/Delivered (Vendure)
```

---

## Key GraphQL Mutations & Queries

### Cart Conversion Mutations:
1. `setCustomerForOrder` - Set customer information
2. `addItemToOrder` - Add each cart item
3. `applyCouponCode` - Apply discount codes
4. `setOrderShippingAddress` - Set shipping address
5. `setOrderBillingAddress` - Set billing address

### Checkout Flow Mutations:
6. `setOrderShippingMethod` - Set shipping method
7. `transitionOrderToState` - Change order state
8. `createPreOrderStripePaymentIntent` - Create Stripe payment
9. `linkPaymentIntentToOrder` - Link payment to order
10. `settleStripePayment` - Confirm payment success

### Confirmation Queries:
11. `getActiveOrderQuery` - Get current order
12. `getOrderByCodeQuery` - Get order by confirmation code

---

## Session Storage Usage

**Purpose**: Bridge data between payment flow and confirmation

**Keys Stored**:
- `pendingOrderCode` - Order code for confirmation lookup
- `pendingOrderId` - Order ID for confirmation lookup

**Storage Points**:
- Set in: `StripePaymentForm.tsx` before payment confirmation
- Used in: `confirmation/index.tsx` for order lookup
- Cleared in: `confirmation/[code]/index.tsx` after successful display

---

## Error Handling & Recovery

### Payment Errors:
- Stripe validation failures → Stay on checkout with error
- Backend settlement failures → Fallback to webhook polling
- Timeout errors → Display error with support contact

### Order Lookup Errors:
- Order not found → Display helpful error page
- Invalid order codes → Redirect to shopping

### Stock Validation Errors:
- Out of stock items → Block checkout with warnings
- Stock changes during checkout → Refresh and re-validate

---

## Performance Optimizations

1. **Parallel Operations**: Address submission and shipping method setting
2. **Prefetching**: Order confirmation page prefetched during payment
3. **Caching**: Validation cache for checkout fields
4. **Non-blocking**: Shipping calculations use `useResource$`
5. **Debouncing**: Country selection debounced to prevent rapid changes

---

## Security Measures

1. **Client Secret**: Stripe client secrets for secure payment
2. **Backend Validation**: All critical operations validated server-side
3. **State Verification**: Order state transitions validated
4. **Payment Confirmation**: Dual confirmation (Stripe + Backend settlement)
5. **Session Management**: Temporary data cleared after successful completion

This comprehensive flow ensures reliable order processing from cart to confirmation with proper error handling, state management, and security measures.# Complete Checkout Flow Mapping

## Overview
This document maps out every step from when a customer hits "Proceed to Checkout" until the order confirmation screen is shown, including all queries, actions, mutations, and state transitions.

## Flow Architecture Summary
- **Cart Mode**: Local Cart (localStorage) → Convert to Vendure Order → Stripe Payment → Order Confirmation
- **Payment Method**: Stripe Payment Intents with pre-order creation
- **Backend**: Vendure GraphQL API with custom Stripe plugin
- **Order States**: Draft → ArrangingPayment → PaymentSettled → Delivered

---

## Step-by-Step Checkout Flow

### 1. Cart: "Proceed to Checkout" Button Click
**File**: `/frontend/src/components/cart/Cart.tsx` (lines 565-584)

**Trigger**: User clicks "Proceed to Checkout" button

**Validations Before Checkout**:
- Cart not empty: `localCart.localCart.items.length > 0`
- Shipping method selected: `shippingState.selectedMethod`
- Country selected: `appState.shippingAddress.countryCode`
- No out-of-stock items: `!isOutOfStock.value`

**Actions**:
1. Set navigation loading state: `isNavigatingToCheckout.value = true`
2. Validate cart data (items, shipping method, country)
3. Navigate to checkout page: `navigate('/checkout/')`

**No Backend Calls**: All data managed in localStorage until final order placement

---

### 2. Checkout Page Load & Initialization
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 121-172)

**Component**: `CheckoutContent`

**Initial State Setup**:
```typescript
const state = useStore<CheckoutState>({
  loading: false,
  error: null,
});
const pageLoading = useSignal(true);
const isOrderProcessing = useSignal(false);
const showProcessingModal = useSignal(false);
```

**Page Load Actions (`useVisibleTask$`)**:
1. **Initialize Validation System**:
   - `clearAllValidationCache()`
   - `resetCacheMonitoring()`
   - `enablePerformanceLogging()`
   - `enableAutoCleanup()`

2. **Load Stripe Configuration**:
   - **Query**: `getStripePublishableKeyQuery()`
   - **Result**: Store in `stripePublishableKey.value`

3. **Load Cart Data**:
   - **Action**: `loadCartIfNeeded(localCart)`
   - **Purpose**: Ensure cart data is available

4. **Refresh Stock Levels**:
   - **Action**: `refreshCartStock(localCart)`
   - **Validation**: `LocalCartService.validateStock()`
   - **Update State**: `validationActions.updateStockValidation()`

5. **Set Page Ready**: `pageLoading.value = false`

**Key State Changes**:
- Hide cart overlay: `appState.showCart = false`
- Initialize checkout validation context
- Load and validate cart stock levels

---

### 3. Checkout Form Rendering & Address Entry
**Files**: 
- `/frontend/src/components/checkout/CheckoutAddresses.tsx`
- `/frontend/src/components/checkout/StripePaymentForm.tsx`

**Components Rendered**:
1. **Order Summary** (left column):
   - `<CartContents />` - displays cart items
   - `<CartTotals />` - displays pricing breakdown

2. **Checkout Form** (right column):
   - `<CheckoutAddresses />` - customer info & addresses
   - `<StripePaymentForm />` - payment form
   - Terms & conditions checkbox
   - "Place Order" button

**Stripe Payment Form Initialization**:
1. **Payment Intent Creation**:
   - **Mutation**: `createPreOrderStripePaymentIntent`
   - **Parameters**: `estimatedTotal`, `currency`
   - **Result**: `paymentIntentId`, `clientSecret`

2. **Stripe Elements Setup**:
   - Initialize Stripe with publishable key
   - Create payment elements with client secret
   - Set up form validation

**Address Form State**:
- Customer information (email, name, phone)
- Shipping address (street, city, province, postal code, country)
- Billing address (if different from shipping)

---

### 4. "Place Order" Button Click
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 196-374)

**Function**: `_placeOrder`

**Pre-validation**:
- Order not already processing: `!isOrderProcessing.value`
- All required fields completed
- Terms & conditions accepted: `checkoutValidation.isAllValid`

**Step 4.1: Stripe Payment Form Validation**:
```typescript
// Validate Stripe payment form
if (typeof window !== 'undefined' && (window as any).submitStripeElements) {
  await (window as any).submitStripeElements();
}
```

**Step 4.2: Set Processing State**:
```typescript
showProcessingModal.value = true;
isOrderProcessing.value = true;
orderError.value = '';
state.error = null;
```

**Step 4.3: Final Validation**:
- Customer info: email, firstName, lastName
- Shipping address: streetLine1, city, province, postalCode, countryCode
- Billing address (if different billing enabled)

---

### 5. Local Cart to Vendure Order Conversion
**File**: `/frontend/src/contexts/CartContext.tsx` (lines 274-311)

**Function**: `convertLocalCartToVendureOrder`

**Process**:
1. **Stock Validation**:
   - **Action**: `LocalCartService.validateStock()`
   - **Check**: Verify all items still in stock
   - **Fail Case**: Return null if validation fails

2. **Extract Applied Coupon**:
   ```typescript
   const appliedCoupon = cartState.appliedCoupon ? { code: cartState.appliedCoupon.code } : null;
   ```

3. **Convert to Vendure Order**:
   - **Action**: `LocalCartService.convertToVendureOrder(appliedCoupon)`
   - **Backend Mutations Called**:
     - `setCustomerForOrder` (customer info)
     - `addItemToOrder` (for each cart item)
     - `applyCouponCode` (if coupon applied)
     - `setOrderShippingAddress`
     - `setOrderBillingAddress` (if different)

4. **State Transition**:
   ```typescript
   if (order) {
     cartState.isLocalMode = false;  // Switch to Vendure mode
     cartState.lastStockValidation = {};
     cartState.appliedCoupon = null;
   }
   ```

**Result**: Vendure Order object with state "Draft"

---

### 6. Address Submission
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 253-282)

**Process**:
1. **Submit Address Form**:
   ```typescript
   if (typeof window !== 'undefined' && (window as any).submitCheckoutAddressForm) {
     await (window as any).submitCheckoutAddressForm();
   }
   ```

2. **Wait for Completion**:
   - Poll `addressState.addressSubmissionComplete`
   - Maximum wait time: 10 seconds
   - Check interval: 100ms

**Backend Mutations**:
- `setOrderShippingAddress`
- `setOrderBillingAddress` (if different billing)

---

### 7. Shipping Method Selection
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 284-320)

**Logic**:
```typescript
if (appState.shippingAddress.countryCode && appState.activeOrder) {
  const countryCode = appState.shippingAddress.countryCode;
  const subTotal = appState.activeOrder?.subTotal || 0;
  
  // Determine shipping method ID
  if (countryCode === 'US' || countryCode === 'PR') {
    shippingMethodId = subTotal >= 10000 ? '6' : '3';  // Free vs $8 shipping
  } else {
    shippingMethodId = '7';  // International $20
  }
}
```

**Backend Mutation**:
- **Mutation**: `setOrderShippingMethodMutation([shippingMethodId])`
- **Result**: Updated order with shipping costs

---

### 8. Order State Transition to ArrangingPayment
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 322-335)

**Backend Mutation**:
```typescript
const { transitionOrderToStateMutation } = await import('~/providers/shop/checkout/checkout');
const transitionResult = await transitionOrderToStateMutation('ArrangingPayment');
```

**Purpose**: Prepare order for payment processing
**Order State**: Draft → ArrangingPayment

---

### 9. Get Latest Order & Trigger Payment
**File**: `/frontend/src/routes/checkout/index.tsx` (lines 337-363)

**Process**:
1. **Refresh Order Data**:
   - **Query**: `getActiveOrderQuery()`
   - **Purpose**: Get latest order state with shipping/billing info

2. **Verify Order State**:
   - Check: `latestOrder.state === 'ArrangingPayment'`
   - Store: `appState.activeOrder = latestOrder`

3. **Trigger Stripe Payment**:
   ```typescript
   if (typeof window !== 'undefined' && (window as any).confirmStripePreOrderPayment) {
     await (window as any).confirmStripePreOrderPayment(appState.activeOrder);
   }
   ```

---

### 10. Stripe Payment Confirmation
**File**: `/frontend/src/components/checkout/StripePaymentForm.tsx` (lines 214-244)

**Function**: `confirmStripePreOrderPayment`

**Process**:
1. **Store Order Info for Confirmation Page**:
   ```typescript
   sessionStorage.setItem('pendingOrderCode', order.code);
   sessionStorage.setItem('pendingOrderId', order.id);
   ```

2. **Complete Stripe Payment**:
   - **Action**: `payment.completePayment(order.id, order.code)`
   - **Stripe API**: `stripe.confirmPayment()`
   - **Parameters**: 
     ```typescript
     {
       elements: state.elements,
       confirmParams: {
         return_url: `${window.location.origin}/checkout/confirmation/${orderCode}`
       }
     }
     ```

**Payment Flow Details** (from `/frontend/src/hooks/useStripePayment.ts`):

1. **Stripe Confirmation**:
   ```typescript
   const result = await state.stripe.confirmPayment({
     elements: state.elements,
     confirmParams: {
       return_url: orderCode ? `${window.location.origin}/checkout/confirmation/${orderCode}` 
                             : `${window.location.origin}/checkout/confirmation`,
     },
   });
   ```

2. **Error Handling**:
   - If `result.error`: Report failure to backend via `confirmStripePaymentFailureMutation`
   - If payment status ≠ 'succeeded': Report status failure

3. **Success Handling**:
   ```typescript
   // Settle payment with backend
   const { settleStripePaymentMutation } = await import('~/providers/shop/checkout/checkout');
   const settlementResult = await settleStripePaymentMutation(state.paymentIntentId);
   ```

**Backend Settlement Mutation**:
```graphql
mutation settleStripePayment($paymentIntentId: String!) {
  settleStripePayment(paymentIntentId: $paymentIntentId) {
    success
    orderId
    orderCode
    paymentId
    error
  }
}
```

---

### 11. Stripe Redirect to Confirmation
**Flow**: Stripe redirects to confirmation URL with payment result

**URL Format**: `/checkout/confirmation/${orderCode}?payment_intent=pi_xxx&redirect_status=succeeded`

**Two Confirmation Routes**:

#### 11A. Generic Confirmation Handler
**File**: `/frontend/src/routes/checkout/confirmation/index.tsx`

**Purpose**: Handle Stripe redirects and find the order

**Process**:
1. **Extract URL Parameters**:
   ```typescript
   const paymentIntent = urlParams.get('payment_intent');
   const redirectStatus = urlParams.get('redirect_status');
   ```

2. **Validate Payment Status**:
   - Check: `redirectStatus === 'succeeded'`
   - Error if not successful

3. **Attempt Backend Settlement**:
   ```typescript
   const { settleStripePaymentMutation } = await import('~/providers/shop/checkout/checkout');
   const settlementResult = await settleStripePaymentMutation(paymentIntent);
   ```

4. **Success Redirect**:
   ```typescript
   if (settlementResult && settlementResult.success) {
     navigate(`/checkout/confirmation/${settlementResult.orderCode}`);
   }
   ```

5. **Fallback Polling** (if settlement fails):
   - Check sessionStorage for `pendingOrderCode`
   - Poll order status for up to 30 seconds
   - Look for order state: `PaymentSettled`

#### 11B. Order-Specific Confirmation
**File**: `/frontend/src/routes/checkout/confirmation/[code]/index.tsx`

**Purpose**: Display final order confirmation

**Process**:
1. **Load Order by Code**:
   - **Query**: `getOrderByCodeQuery(code)`
   - **Purpose**: Get complete order details

2. **Clear Application State**:
   ```typescript
   // Reset active order
   appState.activeOrder = {
     id: '', code: '', lines: [], state: 'Completed',
     totalWithTax: 0, subTotal: 0, shippingLines: [], payments: []
   };
   
   // Clear local cart
   clearLocalCartOnSuccess(localCart);
   ```

3. **Display Order Confirmation**:
   - Order summary with items and totals
   - Customer information
   - Shipping address
   - Billing address (if different)
   - Shipping method
   - Payment method details

---

## Order State Transitions

```
Local Cart (localStorage) 
    ↓ [Place Order]
Draft Order (Vendure)
    ↓ [Address & Shipping Setup]
ArrangingPayment (Vendure)
    ↓ [Stripe Payment Success]
PaymentSettled (Vendure)
    ↓ [Admin Processing]
Shipped/Delivered (Vendure)
```

---

## Key GraphQL Mutations & Queries

### Cart Conversion Mutations:
1. `setCustomerForOrder` - Set customer information
2. `addItemToOrder` - Add each cart item
3. `applyCouponCode` - Apply discount codes
4. `setOrderShippingAddress` - Set shipping address
5. `setOrderBillingAddress` - Set billing address

### Checkout Flow Mutations:
6. `setOrderShippingMethod` - Set shipping method
7. `transitionOrderToState` - Change order state
8. `createPreOrderStripePaymentIntent` - Create Stripe payment
9. `linkPaymentIntentToOrder` - Link payment to order
10. `settleStripePayment` - Confirm payment success

### Confirmation Queries:
11. `getActiveOrderQuery` - Get current order
12. `getOrderByCodeQuery` - Get order by confirmation code

---

## Session Storage Usage

**Purpose**: Bridge data between payment flow and confirmation

**Keys Stored**:
- `pendingOrderCode` - Order code for confirmation lookup
- `pendingOrderId` - Order ID for confirmation lookup

**Storage Points**:
- Set in: `StripePaymentForm.tsx` before payment confirmation
- Used in: `confirmation/index.tsx` for order lookup
- Cleared in: `confirmation/[code]/index.tsx` after successful display

---

## Error Handling & Recovery

### Payment Errors:
- Stripe validation failures → Stay on checkout with error
- Backend settlement failures → Fallback to webhook polling
- Timeout errors → Display error with support contact

### Order Lookup Errors:
- Order not found → Display helpful error page
- Invalid order codes → Redirect to shopping

### Stock Validation Errors:
- Out of stock items → Block checkout with warnings
- Stock changes during checkout → Refresh and re-validate

---

## Performance Optimizations

1. **Parallel Operations**: Address submission and shipping method setting
2. **Prefetching**: Order confirmation page prefetched during payment
3. **Caching**: Validation cache for checkout fields
4. **Non-blocking**: Shipping calculations use `useResource$`
5. **Debouncing**: Country selection debounced to prevent rapid changes

---

## Security Measures

1. **Client Secret**: Stripe client secrets for secure payment
2. **Backend Validation**: All critical operations validated server-side
3. **State Verification**: Order state transitions validated
4. **Payment Confirmation**: Dual confirmation (Stripe + Backend settlement)
5. **Session Management**: Temporary data cleared after successful completion

This comprehensive flow ensures reliable order processing from cart to confirmation with proper error handling, state management, and security measures.