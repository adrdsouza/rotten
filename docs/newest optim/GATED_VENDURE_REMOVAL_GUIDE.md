# Gated Vendure Branches/Imports Removal Guide

## Overview

This document identifies all gated Vendure code paths in the frontend that can be safely removed since the application only uses Local Cart Mode. These are conditional code branches that check for `localCart.isLocalMode` vs Vendure Active Order mode.

## Summary of Findings

After analyzing the entire frontend codebase, the following files contain gated Vendure branches that need removal:

### Files with Gated Code:
1. **Cart.tsx** - Checkout button validation logic
2. **CartContents.tsx** - Item removal logic
3. **CartTotals.tsx** - Order totals and coupon handling
4. **CheckoutAddresses.tsx** - Address mutation logic
5. **checkout/index.tsx** - Order conversion and state management

### Files with Vendure Imports (Safe to Remove):
- Various GraphQL queries and mutations in `providers/shop/orders/order.ts`
- `appState.activeOrder` references throughout components

---

## Detailed Removal Instructions

### 1. Cart.tsx

**Location:** `/frontend/src/components/cart/Cart.tsx`

**Gated Code (Lines ~560-562):**
```typescript
disabled={isNavigatingToCheckout.value || !shippingState.selectedMethod || 
    !appState.shippingAddress.countryCode || 
    (!localCart.isLocalMode && !appState.activeOrder?.id) ||
    (localCart.isLocalMode && localCart.localCart.items.length === 0) || isOutOfStock.value}
```

**Safe Removal:**
- Remove the `(!localCart.isLocalMode && !appState.activeOrder?.id)` condition
- Simplify to only check local cart conditions

**After Removal:**
```typescript
disabled={isNavigatingToCheckout.value || !shippingState.selectedMethod || 
    !appState.shippingAddress.countryCode || 
    localCart.localCart.items.length === 0 || isOutOfStock.value}
```

---

### 2. CartContents.tsx

**Location:** `/frontend/src/components/cart-contents/CartContents.tsx`

**Gated Code (Lines ~460-480):**
```typescript
if (localCart.isLocalMode) {
    // Use local cart service for removal
    await updateLocalCartQuantity(
        currentOrderLineSignal.value.id,
        currentOrderLineSignal.value.value
    );
} else {
    // Use Vendure order mutations for removal
    const result = await adjustOrderLineMutation({
        orderLineId: currentOrderLineSignal.value.id,
        quantity: currentOrderLineSignal.value.value,
    });
    if (result) {
        appState.activeOrder = result;
    }
}
```

**Safe Removal:**
- Remove the entire `if/else` block
- Keep only the local cart logic
- Remove unused Vendure imports: `adjustOrderLineMutation`

**After Removal:**
```typescript
// Always use local cart service for removal
await updateLocalCartQuantity(
    currentOrderLineSignal.value.id,
    currentOrderLineSignal.value.value
);
```

---

### 3. CartTotals.tsx

**Location:** `/frontend/src/components/cart-totals/CartTotals.tsx`

**Gated Code (Lines ~20-30):**
```typescript
// Use passed order prop if available, otherwise fall back to appState.activeOrder
const activeOrder = useComputed$(() => order || appState.activeOrder);

// Determine if we should use local cart data
const shouldUseLocalCartData = useComputed$(() => {
    const shouldUseLocal = localCart && (localCart.isLocalMode === true || (localCart.localCart && localCart.localCart.items));
    return shouldUseLocal;
});
```

**Safe Removal:**
- Remove `activeOrder` computed value
- Remove `shouldUseLocalCartData` conditional logic
- Always use local cart data
- Remove unused imports: `applyCouponCodeMutation`, `removeCouponCodeMutation`
- Remove `order?: Order` prop since it's only used for Vendure orders

**After Removal:**
```typescript
// Always use local cart data - no conditional logic needed
const subtotal = useComputed$(() => localCart.localCart?.subTotal || localCart.subTotal || 0);
```

---

### 4. CheckoutAddresses.tsx

**Location:** `/frontend/src/components/checkout/CheckoutAddresses.tsx`

**Gated Code (Lines ~420-450):**
```typescript
// Check for active order before attempting address mutations
const latestOrderBeforeMutations = await getActiveOrderQuery();
if (!latestOrderBeforeMutations || !latestOrderBeforeMutations.id) {
    throw new Error('No active order found. Please retry the checkout process.');
}
appState.activeOrder = latestOrderBeforeMutations;
```

**Safe Removal:**
- This code runs after local cart conversion to Vendure order
- Keep this logic as it's needed for the final order placement
- **DO NOT REMOVE** - This is post-conversion logic

---

### 5. checkout/index.tsx

**Location:** `/frontend/src/routes/checkout/index.tsx`

**Gated Code (Lines ~177-191):**
```typescript
if (localCart.isLocalMode) {
    try {
        const vendureOrder = await convertLocalCartToVendureOrder();
        if (!vendureOrder) {
            throw new Error(checkoutState.error || 'Failed to create order from your cart.');
        }
        appState.activeOrder = vendureOrder;
    } catch (conversionError) {
        // Error handling...
        return;
    }
}
```

**Safe Removal:**
- Remove the `if (localCart.isLocalMode)` condition
- Always perform the conversion since we're always in local mode
- Keep the conversion logic and error handling

**After Removal:**
```typescript
// Always convert local cart to Vendure order for checkout
try {
    const vendureOrder = await convertLocalCartToVendureOrder();
    if (!vendureOrder) {
        throw new Error(checkoutState.error || 'Failed to create order from your cart.');
    }
    appState.activeOrder = vendureOrder;
} catch (conversionError) {
    state.error = conversionError instanceof Error ? conversionError.message : 'An unknown error occurred while creating your order.';
    showProcessingModal.value = false;
    isOrderProcessing.value = false;
    return;
}
```

---

## Unused Imports to Remove

### From providers/shop/orders/order.ts:
- `adjustOrderLineMutation` (used in CartContents.tsx)
- `applyCouponCodeMutation` (used in CartTotals.tsx)
- `removeCouponCodeMutation` (used in CartTotals.tsx)

### From component imports:
- Remove `Order` type imports where only used for gated logic
- Remove `appState.activeOrder` references in conditional checks

---

## Safe Removal Steps

### Step 1: Update Cart.tsx
1. Simplify the checkout button disabled condition
2. Remove Vendure order validation logic

### Step 2: Update CartContents.tsx
1. Remove the `if (localCart.isLocalMode)` conditional
2. Always use local cart service for item updates
3. Remove unused Vendure mutation imports

### Step 3: Update CartTotals.tsx
1. Remove `shouldUseLocalCartData` conditional logic
2. Always use local cart data for calculations
3. Remove unused coupon mutation imports
4. Remove `order?: Order` prop

### Step 4: Update checkout/index.tsx
1. Remove `if (localCart.isLocalMode)` condition
2. Always perform local cart to Vendure conversion

### Step 5: Clean up imports
1. Remove unused GraphQL mutations
2. Remove unused Order type imports
3. Remove unused appState.activeOrder conditional references

---

## Testing After Removal

### Required Tests:
1. **Cart Operations**: Add/remove items, update quantities
2. **Checkout Flow**: Complete checkout process from cart to order confirmation
3. **Coupon Codes**: Apply/remove coupons in local cart mode
4. **Address Management**: Save and use addresses during checkout
5. **Order Placement**: Verify local cart converts to Vendure order successfully

### Build Verification:
1. Run `npm run build` to ensure no build errors
2. Check for reduced bundle warnings
3. Verify no unused import warnings

---

## Benefits of Removal

1. **Cleaner Code**: Eliminates unnecessary conditional logic
2. **Smaller Bundle**: Removes unused GraphQL mutations and imports
3. **Fewer Build Warnings**: Eliminates dynamic/static import conflicts
4. **Easier Maintenance**: Single code path instead of dual paths
5. **Better Performance**: No runtime conditional checks

---

## Risks and Considerations

### Low Risk:
- All identified gated code is truly unused in Local Cart Mode
- Local cart functionality is well-tested and stable
- Conversion to Vendure order only happens at checkout

### Considerations:
- If you ever need to re-enable Vendure Active Order mode, these paths would need to be reintroduced
- Keep this documentation for reference if reverting changes

---

## Files Not Requiring Changes

These files reference Vendure orders but are used post-conversion (after checkout):
- `routes/checkout/confirmation/[code]/index.tsx`
- `routes/order-status/index.tsx`
- `routes/account/layout.tsx`
- `components/shipping/Shipping.tsx`

These files should **NOT** be modified as they handle legitimate Vendure order operations after the local cart has been converted.