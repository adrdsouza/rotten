# Cart & Checkout Qwik Anti-Patterns Analysis

**Date:** 2025-10-09  
**Status:** Analysis Complete  
**Priority:** High - Multiple anti-patterns found

---

## 🎯 Executive Summary

Found **4 major anti-patterns** and **several minor issues** in cart and checkout components that violate Qwik best practices. These are similar to the trigger pattern we just fixed in ShopComponent.

### Priority Ranking
1. 🔴 **CRITICAL**: CartTotals.tsx - Trigger pattern anti-pattern
2. 🟠 **HIGH**: CheckoutAddresses.tsx - Window object anti-pattern
3. 🟡 **MEDIUM**: Cart.tsx - Unnecessary useVisibleTask$ usage
4. 🟡 **MEDIUM**: ConditionalCart.tsx - Data loading pattern

---

## 🔴 CRITICAL: CartTotals.tsx - Trigger Pattern Anti-Pattern

**File:** `frontend/src/components/cart-totals/CartTotals.tsx`  
**Lines:** 43-52

### Problem
```typescript
// ❌ WRONG - Trigger pattern anti-pattern
const shippingTrigger = useSignal(0);

useVisibleTask$(({ track }) => {
  track(() => appState.shippingAddress.countryCode);
  const countryCode = appState.shippingAddress.countryCode;
  console.log(`🚢 Country change detected: ${countryCode}, forcing shipping recalculation`);
  // Force shipping computed to recalculate by updating trigger signal
  shippingTrigger.value = shippingTrigger.value + 1;
});

const shipping = useComputed$(() => {
  const trigger = shippingTrigger.value; // Track trigger to force recalc
  // ... shipping calculation
});
```

### Why It's Wrong
- **Same anti-pattern we just fixed in ShopComponent**
- useVisibleTask$ watching a signal to update another signal
- Unnecessary indirection and complexity
- useComputed$ should automatically track dependencies

### Solution
```typescript
// ✅ CORRECT - Direct computed with proper tracking
const shipping = useComputed$(() => {
  const countryCode = appState.shippingAddress?.countryCode;
  const orderTotal = orderTotalAfterDiscount.value;
  const timestamp = new Date().toISOString().slice(11, 23);
  
  console.log(`🚢 [CartTotals] [${timestamp}] Calculating shipping for: ${countryCode}`);
  
  if (!countryCode) {
    return activeOrder.value?.shippingWithTax || 0;
  }
  
  if (localCartContext.appliedCoupon?.freeShipping) {
    return 0;
  }
  
  if (countryCode === 'US' || countryCode === 'PR') {
    return orderTotal >= 10000 ? 0 : 800;
  }
  
  return 2000; // International
});
```

### Impact
- Remove 1 useVisibleTask$ watcher
- Remove 1 unnecessary signal
- Simpler, more direct code
- Better performance

---

## 🟠 HIGH: CheckoutAddresses.tsx - Window Object Anti-Pattern

**File:** `frontend/src/components/checkout/CheckoutAddresses.tsx`  
**Lines:** 613-616

### Problem
```typescript
// ❌ WRONG - Exposing function via window object
useVisibleTask$(() => {
  if (typeof window !== 'undefined') {
    (window as any).submitCheckoutAddressForm = submitAddresses;
  }
});
```

### Why It's Wrong
- **Violates Qwik's component communication model**
- Global state pollution
- No type safety
- Hard to track dependencies
- Breaks resumability

### Solution
```typescript
// ✅ CORRECT - Pass function as prop with QRL type
// In CheckoutAddresses component:
export interface CheckoutAddressesProps {
  onAddressesSubmitted$?: QRL<() => void>;
  onSubmitExposed$?: QRL<(submitFn: QRL<() => Promise<void>>) => void>;
}

export const CheckoutAddresses = component$<CheckoutAddressesProps>(({ 
  onAddressesSubmitted$,
  onSubmitExposed$ 
}) => {
  // ... component code ...
  
  // Expose submit function to parent via prop callback
  useVisibleTask$(() => {
    if (onSubmitExposed$) {
      onSubmitExposed$(submitAddresses);
    }
  });
});

// In parent (checkout page):
const submitAddressForm = useSignal<QRL<() => Promise<void>> | null>(null);

<CheckoutAddresses
  onSubmitExposed$={(fn) => { submitAddressForm.value = fn; }}
  onAddressesSubmitted$={handleAddressesSubmitted}
/>

// When placing order:
if (submitAddressForm.value) {
  await submitAddressForm.value();
}
```

### Impact
- Proper Qwik component communication
- Type-safe function passing
- Better resumability
- Easier to test and maintain

---

## 🟡 MEDIUM: Cart.tsx - Unnecessary useVisibleTask$ Usage

**File:** `frontend/src/components/cart/Cart.tsx`

### Issue 1: Out of Stock Check (Lines 90-94)
```typescript
// ❌ CURRENT - Using useVisibleTask$ for computation
const isOutOfStock = useSignal(false);

useVisibleTask$(async ({track}) => {
  track(() => localCart.localCart.items);
  track(() => appState.activeOrder);
  isOutOfStock.value = await hasOutOfStockItems();
});
```

**Solution:**
```typescript
// ✅ BETTER - Use useComputed$ for reactive computation
const isOutOfStock = useComputed$(() => {
  const items = localCart.localCart.items;
  return items.some(
    (item: any) => item.productVariant.stockLevel === 'OUT_OF_STOCK' || 
                   item.productVariant.stockLevel <= 0
  );
});
```

### Issue 2: Country Code Syncing (Lines 100-107)
```typescript
// ❌ CURRENT - Unnecessary signal syncing
const countryCodeSignal = useSignal(appState.shippingAddress.countryCode);

useVisibleTask$(({ track }) => {
  const countryCode = track(() => appState.shippingAddress.countryCode);
  if (countryCode && countryCode !== countryCodeSignal.value) {
    countryCodeSignal.value = countryCode;
  }
});
```

**Solution:**
```typescript
// ✅ BETTER - Use computed signal directly
const countryCode = useComputed$(() => appState.shippingAddress.countryCode);

// Or just use appState.shippingAddress.countryCode directly in JSX
```

### Issue 3: Prefetching (Lines 57-77)
```typescript
// ✅ LEGITIMATE - This is actually correct use of useVisibleTask$
// DOM manipulation and prefetching are valid viewport-dependent operations
useVisibleTask$(({ track }) => {
  track(() => appState.showCart);
  if (appState.showCart) {
    // Prefetch checkout route
  }
});
```

**Note:** This one is actually fine - useVisibleTask$ is appropriate for DOM manipulation.

---

## 🟡 MEDIUM: ConditionalCart.tsx - Data Loading Pattern

**File:** `frontend/src/components/cart/ConditionalCart.tsx`  
**Lines:** 14-24

### Problem
```typescript
// ❌ CURRENT - Data loading in useVisibleTask$
useVisibleTask$(async () => {
  if (!isHomePage) {
    loadCartIfNeeded(localCart);
    if (localCart.localCart.items.length > 0) {
      await refreshCartStock(localCart);
    }
  }
});
```

### Why It's Suboptimal
- useVisibleTask$ runs after component is visible
- Data loading should use useResource$ for better loading states
- No loading indicator during stock refresh

### Solution
```typescript
// ✅ BETTER - Use useResource$ for data loading
const stockRefresh = useResource$(async ({ track, cleanup }) => {
  if (isHomePage) return; // Skip on homepage
  
  loadCartIfNeeded(localCart);
  
  if (localCart.localCart.items.length > 0) {
    return await refreshCartStock(localCart);
  }
});

// In JSX, can show loading state:
<Resource
  value={stockRefresh}
  onPending={() => <div>Loading cart...</div>}
  onResolved={() => <Cart />}
/>
```

### Impact
- Better loading states
- Runs immediately, not after visibility
- More Qwik-idiomatic

---

## 📊 CheckoutAddresses.tsx - Excessive useVisibleTask$ Usage

**File:** `frontend/src/components/checkout/CheckoutAddresses.tsx`  
**Count:** 8+ useVisibleTask$ watchers

### Analysis
Most of these are **legitimate** reactive logic:
- ✅ Billing checkbox toggle (lines 182-231) - Legitimate
- ✅ Country code syncing (lines 235-246) - Legitimate
- ✅ Clearing validation errors (lines 252-271) - Legitimate
- ✅ Form field updates (lines 275-303) - Legitimate
- ✅ Main validation with debouncing (lines 307-327) - Legitimate
- ✅ Immediate country validation (lines 331-340+) - Legitimate
- ❌ Window object exposure (lines 613-616) - **ANTI-PATTERN**
- ⚠️ Signal syncing (lines 163-174) - Could be simplified

### Recommendation
- **Fix the window object anti-pattern** (high priority)
- **Consider simplifying signal syncing** (low priority)
- **Keep the rest** - they're legitimate reactive logic for complex form validation

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Fixes (Do Now)
1. ✅ Fix CartTotals.tsx trigger pattern
2. ✅ Fix CheckoutAddresses.tsx window object anti-pattern

### Phase 2: Medium Priority (Next Sprint)
3. Optimize Cart.tsx useVisibleTask$ usage
4. Improve ConditionalCart.tsx data loading

### Phase 3: Low Priority (Future)
5. Review CheckoutAddresses.tsx signal syncing
6. Add comprehensive timing logs like ShopComponent

---

## 📚 Qwik Best Practices Reminder

### When to Use Each Hook

**useVisibleTask$** - ONLY for:
- ✅ Viewport-dependent operations (analytics, lazy loading)
- ✅ DOM manipulation (prefetching, script loading)
- ✅ Browser-only APIs (localStorage, geolocation)
- ❌ NOT for event handling
- ❌ NOT for watching signals to update other signals

**useComputed$** - For:
- ✅ Derived state from other signals
- ✅ Reactive computations
- ✅ Automatic dependency tracking

**useResource$** - For:
- ✅ Data fetching
- ✅ Async operations with loading states
- ✅ Server-side data loading

**useTask$** - For:
- ✅ Side effects that run on server and client
- ✅ Reactive logic that needs to run immediately

**QRL Props** - For:
- ✅ Component communication (parent ↔ child)
- ✅ Event handlers
- ✅ Callback functions

---

## 🔍 Files Analyzed

- ✅ `frontend/src/components/cart-totals/CartTotals.tsx`
- ✅ `frontend/src/components/checkout/CheckoutAddresses.tsx`
- ✅ `frontend/src/components/cart/Cart.tsx`
- ✅ `frontend/src/components/cart/ConditionalCart.tsx`
- ✅ `frontend/src/components/checkout/Payment.tsx`
- ✅ `frontend/src/components/payment/StripePayment.tsx`

---

## ✅ Next Steps

Would you like me to:
1. **Fix the critical issues** (CartTotals + CheckoutAddresses window object)?
2. **Create a comprehensive refactor** for all issues?
3. **Start with one component** as proof of concept?
4. **Review more files** for additional anti-patterns?

