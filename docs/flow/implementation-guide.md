# Qwik Integration Implementation Guide

## PHASE 1: CRITICAL FIXES (Start Immediately)

### 1.1 Fix CartContext State Management

**Current Issue**: Using React patterns in CartContext
**File**: `src/contexts/CartContext.tsx`

**Changes Required**:

```typescript
// BEFORE (Current - React pattern)
useTask$(({ track }) => {
  track(() => cartSignal.value);
  // Recalculate totals - THIS IS WRONG IN QWIK
});

// AFTER (Qwik pattern)
const cartTotal = useComputed$(() => {
  return cartState.localCart.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
});

const cartQuantity = useComputed$(() => {
  return cartState.localCart.items.reduce((sum, item) => sum + item.quantity, 0);
});

const shippingEstimate = useComputed$(() => {
  if (cartState.localCart.items.length === 0) return 0;
  // Calculate shipping based on cart contents
  return calculateShippingCost(cartState.localCart);
});

// useTask$ ONLY for side effects
useTask$(({ track }) => {
  track(() => cartState.localCart);
  // Side effects only: save to localStorage, analytics
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('vendure_local_cart', JSON.stringify(cartState.localCart));
  }
});
```

### 1.2 Fix Signal Mutations in LocalCartService

**Current Issue**: Creating unnecessary object spreads
**File**: `src/services/LocalCartService.ts`

**Changes Required**:

```typescript
// BEFORE (Current - inefficient)
static addItem(item: LocalCartItem): { cart: LocalCart; stockResult: StockValidationResult } {
  const cart = this.getCart();
  cart.items = [...cart.items, item]; // Inefficient spread
  this.recalculateTotals(cart);
  this.saveCart(cart);
  return { cart, stockResult };
}

// AFTER (Qwik optimized)
static addItem(item: LocalCartItem): { cart: LocalCart; stockResult: StockValidationResult } {
  const cart = this.getCart();
  
  // Direct array manipulation - more efficient
  const existingIndex = cart.items.findIndex(i => i.productVariantId === item.productVariantId);
  
  if (existingIndex >= 0) {
    cart.items[existingIndex].quantity += item.quantity;
  } else {
    cart.items.push(item);
  }
  
  this.recalculateTotals(cart);
  this.saveCart(cart);
  return { cart, stockResult: { success: true } };
}
```

### 1.3 Add Server-Side Price Validation (CRITICAL SECURITY)

**Current Issue**: Client-side price calculations
**New File**: `src/routes/api/validate-cart/index.ts`

```typescript
import type { RequestHandler } from '@qwik.dev/core';

export const onPost: RequestHandler = async ({ json, fail }) => {
  const { cart } = await json();
  
  // Server-side price validation
  const serverPrices = await validateCartPrices(cart.items);
  
  let totalMismatch = false;
  const corrections = [];
  
  for (const item of cart.items) {
    const serverPrice = serverPrices.find(p => p.variantId === item.productVariantId);
    if (serverPrice && serverPrice.price !== item.unitPrice) {
      totalMismatch = true;
      corrections.push({
        variantId: item.productVariantId,
        clientPrice: item.unitPrice,
        serverPrice: serverPrice.price
      });
    }
  }
  
  if (totalMismatch) {
    return fail(400, {
      error: 'PRICE_MISMATCH',
      message: 'Prices have changed. Please refresh your cart.',
      corrections
    });
  }
  
  return { valid: true };
};
```

## PHASE 2: ROUTE OPTIMIZATION (Week 2)

### 2.1 Convert Checkout to routeAction$

**Current Issue**: Using fetch() instead of Qwik's built-in patterns
**File**: `src/routes/checkout/index.tsx`

**Add these exports**:

```typescript
// Add to top of checkout/index.tsx
export const useCheckoutAction = routeAction$(async (formData, { cookie, fail, redirect }) => {
  try {
    // Validate CSRF token
    const csrfToken = formData.get('_token');
    if (!validateCSRF(csrfToken, cookie)) {
      return fail(403, { error: 'Invalid CSRF token' });
    }
    
    // Parse form data
    const checkoutData = {
      customer: {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        emailAddress: formData.get('email'),
        phoneNumber: formData.get('phone')
      },
      shippingAddress: {
        streetLine1: formData.get('streetLine1'),
        city: formData.get('city'),
        postalCode: formData.get('postalCode'),
        countryCode: formData.get('countryCode')
      },
      paymentToken: formData.get('paymentToken')
    };
    
    // Server-side validation
    const validation = await validateCheckoutData(checkoutData);
    if (!validation.valid) {
      return fail(400, { error: validation.errors });
    }
    
    // Process order
    const order = await processCheckoutOrder(checkoutData);
    
    if (order.success) {
      throw redirect(302, `/checkout/confirmation/${order.code}`);
    } else {
      return fail(400, { error: order.error });
    }
    
  } catch (error) {
    return fail(500, { error: 'Checkout failed. Please try again.' });
  }
});

export const useCartLoader = routeLoader$(async ({ cookie }) => {
  // Load server cart state if user is logged in
  const session = await getSession(cookie);
  if (session?.userId) {
    return await getServerCart(session.userId);
  }
  return null;
});
```

### 2.2 Add Progressive Enhancement to Forms

**New File**: `src/components/checkout/ProgressiveCheckoutForm.tsx`

```typescript
import { component$, $, useSignal } from '@qwik.dev/core';
import { Form } from '@qwik.dev/router';
import { useCheckoutAction } from '../../routes/checkout';

export const ProgressiveCheckoutForm = component$(() => {
  const checkoutAction = useCheckoutAction();
  const isSubmitting = useSignal(false);
  
  const handleSubmit = $(async (event: SubmitEvent) => {
    isSubmitting.value = true;
    
    // Client-side validation for better UX
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Basic validation
    if (!formData.get('email') || !formData.get('firstName')) {
      event.preventDefault();
      alert('Please fill in required fields');
      isSubmitting.value = false;
      return;
    }
    
    // Form will submit normally to routeAction$
  });
  
  return (
    <Form action={checkoutAction} onSubmit$={handleSubmit}>
      {/* This form works WITHOUT JavaScript */}
      <input type="hidden" name="_token" value={csrfToken} />
      
      <fieldset disabled={isSubmitting.value}>
        <input 
          type="email" 
          name="email" 
          required 
          placeholder="Email"
        />
        <input 
          type="text" 
          name="firstName" 
          required 
          placeholder="First Name"
        />
        {/* ... other fields ... */}
        
        <button type="submit">
          {isSubmitting.value ? 'Processing...' : 'Place Order'}
        </button>
      </fieldset>
      
      {checkoutAction.value?.error && (
        <div class="error">{checkoutAction.value.error}</div>
      )}
    </Form>
  );
});
```

## PHASE 3: PERFORMANCE OPTIMIZATIONS (Week 3)

### 3.1 Add Lazy Loading to Heavy Components

**File**: `src/components/payment/Payment.tsx`

```typescript
import { component$, lazy$, useSignal, Resource } from '@qwik.dev/core';

// Lazy load heavy payment components
const NMIPayment = lazy$(() => import('./NMI'));
const StripePayment = lazy$(() => import('./Stripe'));
const PayPalPayment = lazy$(() => import('./PayPal'));

export default component$(() => {
  const selectedPaymentMethod = useSignal('nmi');
  
  return (
    <div>
      <select 
        value={selectedPaymentMethod.value}
        onChange$={(_, el) => selectedPaymentMethod.value = el.value}
      >
        <option value="nmi">Credit Card</option>
        <option value="stripe">Stripe</option>
        <option value="paypal">PayPal</option>
      </select>
      
      {/* Only load the selected payment component */}
      {selectedPaymentMethod.value === 'nmi' && (
        <NMIPayment />
      )}
      {selectedPaymentMethod.value === 'stripe' && (
        <StripePayment />
      )}
      {selectedPaymentMethod.value === 'paypal' && (
        <PayPalPayment />
      )}
    </div>
  );
});
```

### 3.2 Add Resource Loading for Async Data

**File**: `src/components/cart/Cart.tsx`

```typescript
import { component$, useResource$, Resource } from '@qwik.dev/core';

export default component$(() => {
  const shippingResource = useResource$(async ({ track }) => {
    const countryCode = track(() => appState.shippingAddress.countryCode);
    const cartTotal = track(() => appState.activeOrder?.subTotalWithTax || 0);
    
    if (!countryCode || cartTotal === 0) return null;
    
    // This only runs when countryCode or cartTotal changes
    return await calculateShippingMethods(countryCode, cartTotal);
  });
  
  return (
    <div>
      <CartContents />
      
      <Resource
        value={shippingResource}
        onPending={() => <div>Calculating shipping...</div>}
        onResolved={(methods) => (
          <ShippingMethodSelector methods={methods} />
        )}
        onRejected={(error) => (
          <div>Error calculating shipping: {error.message}</div>
        )}
      />
    </div>
  );
});
```

## PHASE 4: ERROR HANDLING (Week 3-4)

### 4.1 Add Error Boundaries

**New File**: `src/components/error-boundary/CheckoutErrorBoundary.tsx`

```typescript
import { component$, Slot } from '@qwik.dev/core';
import { ErrorBoundary } from '@qwik.dev/core';

export const CheckoutErrorBoundary = component$(() => {
  return (
    <ErrorBoundary
      fallback={({ error, retry }) => (
        <div class="error-boundary">
          <h2>Something went wrong with checkout</h2>
          <p>{error.message}</p>
          <button onClick$={retry}>Try Again</button>
          <a href="/cart">Return to Cart</a>
        </div>
      )}
      onError$={(error, errorInfo) => {
        // Log error to monitoring service
        console.error('Checkout Error:', error, errorInfo);
        
        // Send to analytics
        if (typeof window !== 'undefined') {
          window.gtag?.('event', 'exception', {
            description: error.message,
            fatal: false,
            custom_parameter: 'checkout'
          });
        }
      }}
    >
      <Slot />
    </ErrorBoundary>
  );
});
```

### 4.2 Add Proper Loading States

**File**: `src/components/cart/CartSkeleton.tsx`

```typescript
import { component$ } from '@qwik.dev/core';

export const CartSkeleton = component$(() => {
  return (
    <div class="cart-skeleton animate-pulse">
      {/* Product skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} class="flex space-x-4 mb-4">
          <div class="w-16 h-16 bg-gray-200 rounded"></div>
          <div class="flex-1">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div class="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
      
      {/* Total skeleton */}
      <div class="border-t pt-4">
        <div class="h-6 bg-gray-200 rounded w-1/3 ml-auto"></div>
      </div>
    </div>
  );
});
```

## PHASE 5: ADVANCED FEATURES (Week 4)

### 5.1 Add Prefetching

**File**: `src/components/cart/Cart.tsx`

```typescript
import { component$, $, useVisibleTask$ } from '@qwik.dev/core';
import { Link } from '@qwik.dev/router';

export default component$(() => {
  // Prefetch checkout resources when cart opens
  const prefetchCheckout = $(async () => {
    await Promise.all([
      import('../../routes/checkout'),
      import('../payment/Payment'),
      import('../checkout/CheckoutAddresses')
    ]);
  });
  
  useVisibleTask$(({ track }) => {
    const showCart = track(() => appState.showCart);
    
    if (showCart && appState.activeOrder?.totalQuantity > 0) {
      // Prefetch checkout when user opens cart with items
      prefetchCheckout();
    }
  });
  
  return (
    <div>
      <CartContents />
      
      {/* Prefetch checkout page */}
      <Link prefetch href="/checkout" class="checkout-button">
        Proceed to Checkout
      </Link>
    </div>
  );
});
```

### 5.2 Add Performance Monitoring

**New File**: `src/hooks/usePerformanceTracking.ts`

```typescript
import { useVisibleTask$ } from '@qwik.dev/core';

export const usePerformanceTracking = (componentName: string) => {
  useVisibleTask$(() => {
    const startTime = performance.now();
    
    // Track Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      
      entries.forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          // Track LCP
          console.log(`LCP for ${componentName}:`, entry.startTime);
          
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'performance', {
              metric: 'lcp',
              value: entry.startTime,
              component: componentName
            });
          }
        }
      });
    });
    
    observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
    
    return () => {
      const endTime = performance.now();
      console.log(`${componentName} render time:`, endTime - startTime);
      observer.disconnect();
    };
  });
};
```

## IMPLEMENTATION ORDER (Priority Queue)

### Week 1 (CRITICAL - Must Complete)
1. **Day 1-2**: Fix CartContext state management (1.1)
2. **Day 3**: Add server-side price validation (1.3) 
3. **Day 4-5**: Fix signal mutations in LocalCartService (1.2)

### Week 2 (HIGH Priority)
1. **Day 1-2**: Implement routeAction$ for checkout (2.1)
2. **Day 3-4**: Add progressive enhancement to forms (2.2)
3. **Day 5**: Add proper hydration handling

### Week 3 (MEDIUM-HIGH Priority)
1. **Day 1-2**: Add lazy loading to payment components (3.1)
2. **Day 3**: Add Resource loading for async data (3.2)
3. **Day 4-5**: Add error boundaries (4.1)

### Week 4 (MEDIUM Priority)
1. **Day 1-2**: Add loading states and skeletons (4.2)
2. **Day 3**: Add prefetching (5.1)
3. **Day 4-5**: Add performance monitoring (5.2)

## TESTING STRATEGY

### During Development
- [ ] Test each phase on a separate branch
- [ ] Use feature flags for gradual rollout
- [ ] A/B test performance improvements

### Critical Tests
- [ ] Cart functionality remains intact
- [ ] Checkout flow works with and without JavaScript
- [ ] Price validation prevents manipulation
- [ ] Error boundaries catch all scenarios

### Performance Benchmarks
- [ ] Before: Measure current LCP, FID, CLS
- [ ] After: Verify improvements in Core Web Vitals
- [ ] Bundle size: Ensure lazy loading reduces initial bundle

This implementation plan follows Qwik best practices while addressing all the critical issues identified in the flowchart review. Each phase builds on the previous one, ensuring a stable progression from critical fixes to advanced optimizations.
