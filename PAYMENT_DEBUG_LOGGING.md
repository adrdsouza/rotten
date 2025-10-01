# Payment Debug Logging Guide

## 🔍 Comprehensive Logging Added for "Invalid Order Information" Debug

This document outlines all the debug logging added to help identify and fix the "invalid order information" error and shipping fee calculation issues.

## 📍 Logging Locations

### 1. **Payment.tsx Component**
**Location**: `frontend/src/components/payment/Payment.tsx`

**Logs Added**:
```typescript
// Component initialization logging
console.log('[Payment] Component initialized with props:', {
  triggerStripeSignal: !!_triggerStripeSignal,
  orderDetails,
  isDisabled,
  hideButton: _hideButton,
  selectedPaymentMethod: _externalSelectedPaymentMethod
});

// Order details validation logging
console.log('[Payment] Order details validation:', {
  hasId: !!orderDetails.id,
  hasCode: !!orderDetails.code,
  hasTotalWithTax: !!orderDetails.totalWithTax,
  totalWithTax: orderDetails.totalWithTax,
  hasCustomer: !!orderDetails.customer,
  customerEmail: orderDetails.customer?.emailAddress
});

// Error detection logging
console.error('[Payment] INVALID ORDER INFORMATION DETECTED:', {
  missingId: !orderDetails.id,
  missingCode: !orderDetails.code,
  missingTotal: !orderDetails.totalWithTax,
  orderDetails
});
```

### 2. **Checkout Index (Order Details Building)**
**Location**: `frontend/src/routes/checkout/index.tsx`

**Logs Added**:
```typescript
// Order details building process
console.log('[Checkout] 🔍 Building order details from activeOrder:', appState.activeOrder);
console.log('[Checkout] ✅ Order details built successfully:', orderDetails);

// Validation before passing to Payment component
console.error('[Checkout] ❌ Invalid order details detected:', {
  missingId: !orderDetails.id,
  missingCode: !orderDetails.code,
  missingTotal: !orderDetails.totalWithTax,
  orderDetails
});
```

### 3. **SecureStripePaymentService**
**Location**: `frontend/src/services/SecureStripePaymentService.ts`

**Logs Added**:
```typescript
// Order validation start
console.log('[SecureStripePaymentService] 🔍 Starting order validation for:', order);

// Order structure analysis
console.log('[SecureStripePaymentService] 🔍 Order structure analysis:', {
  id: order.id,
  code: order.code,
  totalWithTax: order.totalWithTax,
  state: order.state,
  currencyCode: order.currencyCode,
  customer: order.customer,
  lines: order.lines?.length || 0,
  shippingAddress: !!order.shippingAddress,
  billingAddress: !!order.billingAddress
});

// Validation success
console.log('[SecureStripePaymentService] ✅ Order validation passed successfully:', {
  id: order.id,
  code: order.code,
  total: order.totalWithTax,
  state: order.state,
  lineCount: order.lines.length,
  currency: order.currencyCode
});
```

### 4. **SecureStripePayment Component**
**Location**: `frontend/src/components/payment/SecureStripePayment.tsx`

**Logs Added**:
```typescript
// Component initialization
console.log('[SecureStripePayment] 🔍 Component initialized with order:', order);
console.log('[SecureStripePayment] 🔍 Order validation check:', {
  hasOrder: !!order,
  orderId: order?.id,
  orderCode: order?.code,
  orderTotal: order?.totalWithTax,
  orderState: order?.state,
  orderCurrency: order?.currencyCode,
  orderLines: order?.lines?.length || 0,
  orderCustomer: order?.customer?.emailAddress
});

// Payment processing start
console.log('[SecureStripePayment] 🚀 Starting secure payment processing...');
console.log('[SecureStripePayment] 🔍 Order details for payment:', {
  orderId: order.id,
  orderCode: order.code,
  orderTotal: order.totalWithTax,
  orderState: order.state,
  orderCurrency: order.currencyCode,
  orderCustomer: order.customer?.emailAddress,
  orderLines: order.lines?.length || 0
});

// Pre-validation before payment processing
console.log('[SecureStripePayment] 🔍 Order validation before processing:', {
  hasOrder: !!order,
  orderId: order?.id,
  orderCode: order?.code,
  orderTotal: order?.totalWithTax,
  orderState: order?.state,
  orderCurrency: order?.currencyCode
});
```

## 🚢 Shipping Fee Calculation Enhancement

### **Enhanced StripePayment.tsx**
**Location**: `frontend/src/components/payment/StripePayment.tsx`

**New Functions Added**:

#### 1. **calculateShippingFee()**
```typescript
const calculateShippingFee = (countryCode: string, orderTotal: number): number => {
  console.log('[calculateShippingFee] Calculating shipping for country:', countryCode, 'order total:', orderTotal);
  
  // US and Puerto Rico shipping logic
  if (countryCode === 'US' || countryCode === 'PR') {
    if (orderTotal >= 10000) { // $100 or more
      console.log('[calculateShippingFee] US/PR order over $100, free shipping');
      return 0; // Free shipping
    } else {
      console.log('[calculateShippingFee] US/PR order under $100, $8 shipping');
      return 800; // $8 shipping
    }
  } else {
    // International shipping: flat $20
    console.log('[calculateShippingFee] International shipping, $20 flat rate');
    return 2000; // $20 shipping
  }
};
```

#### 2. **Enhanced calculateCartTotal()**
```typescript
const calculateCartTotal = (localCart: any, shippingAddress?: any): number => {
  // Calculate subtotal from cart items
  const subtotal = localCart.localCart.items.reduce((total: number, item: any) => {
    const itemTotal = (item.productVariant?.price || 0) * (item.quantity || 0);
    console.log('[calculateCartTotal] Item:', item.productVariant?.name || 'Unknown', 'Price:', item.productVariant?.price, 'Quantity:', item.quantity, 'Total:', itemTotal);
    return total + itemTotal;
  }, 0);

  // Calculate shipping fee based on country and subtotal
  const countryCode = shippingAddress?.countryCode || 'US';
  const shippingFee = calculateShippingFee(countryCode, subtotal);
  
  // Apply coupon discount if available
  const couponDiscount = localCart.localCart.appliedCoupon?.discountAmount || 0;
  
  // Calculate final total: subtotal + shipping - discount
  const finalTotal = subtotal + shippingFee - couponDiscount;
  
  console.log('[calculateCartTotal] Final total calculation:', {
    subtotal,
    shippingFee,
    couponDiscount,
    finalTotal
  });

  return Math.max(finalTotal, 100); // Minimum $1.00
};
```

## 🔍 How to Use These Logs

### **Step 1: Open Browser Developer Tools**
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Clear the console for a fresh start

### **Step 2: Reproduce the Error**
1. Add items to cart
2. Go to checkout
3. Fill in shipping address (try different countries)
4. Proceed to payment step

### **Step 3: Analyze the Logs**
Look for these specific log patterns:

**🔍 Order Details Building:**
```
[Checkout] 🔍 Building order details from activeOrder: {...}
[Checkout] ✅ Order details built successfully: {...}
```

**🔍 Payment Component Initialization:**
```
[Payment] Component initialized with props: {...}
[Payment] Order details validation: {...}
```

**🔍 Order Validation:**
```
[SecureStripePaymentService] 🔍 Starting order validation for: {...}
[SecureStripePaymentService] 🔍 Order structure analysis: {...}
```

**❌ Error Detection:**
```
[Payment] INVALID ORDER INFORMATION DETECTED: {...}
[SecureStripePaymentService] ❌ Order validation failed: {...}
```

**🚢 Shipping Calculation:**
```
[calculateShippingFee] Calculating shipping for country: US order total: 5000
[calculateCartTotal] Final total calculation: { subtotal: 5000, shippingFee: 800, couponDiscount: 0, finalTotal: 5800 }
```

## 🚨 Common Issues to Look For

1. **Missing Order Data**: Check if `activeOrder` is null or undefined
2. **Invalid Order Properties**: Look for missing `id`, `code`, or `totalWithTax`
3. **Shipping Address Issues**: Verify `countryCode` is being set correctly
4. **State Mismatch**: Check if order is in correct state (`ArrangingPayment`)
5. **Shipping Fee Calculation**: Verify shipping fees are being added correctly

## 📋 Next Steps

When you encounter the "invalid order information" error:

1. **Collect the logs** from the browser console
2. **Share the specific error logs** showing where the validation fails
3. **Include the order structure** from the logs to identify missing fields
4. **Note the shipping address** and country code being used
5. **Check the shipping fee calculation** logs to verify correct amounts

This comprehensive logging will help pinpoint exactly where the order validation is failing and ensure shipping fees are calculated correctly based on the country selection.
