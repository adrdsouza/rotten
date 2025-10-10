# Place Order Flow - Optimized Proposal

**Goal:** Reduce checkout time from ~5.6s to ~4.0s (28% improvement)

---

## 🎯 Key Optimizations

1. **Move customer setup to `placeOrder()`** - Right after cart conversion
2. **Eliminate redundant `getActiveOrderQuery()` calls** - Use mutation responses
3. **Make customer address saving non-blocking** - Don't wait for it

---

## 📋 Optimized Flow

### **Step 1: Validation** (~0ms)
**Location:** `checkout/index.tsx`

**No changes** - Same as current

---

### **Step 2: Convert Cart to Vendure Order** (~836ms)
**Location:** `checkout/index.tsx`

**No changes** - Same as current

**Result:** `appState.activeOrder` contains order with items

---

### **✨ NEW Step 3: Set Customer for Order** (~400ms for guest, ~0ms for authenticated)
**Location:** `checkout/index.tsx` (NEW - moved from CheckoutAddresses)

```typescript
// Determine authentication state ONCE
const isAuthenticated = !!appState.customer.id;
console.log(`🔐 User authentication: ${isAuthenticated ? 'AUTHENTICATED' : 'GUEST'}`);

if (!isAuthenticated) {
  // GUEST CHECKOUT - Set customer on order
  const customerData = {
    emailAddress: appState.customer.emailAddress || '',
    firstName: appState.customer.firstName || '',
    lastName: appState.customer.lastName || '',
    phoneNumber: appState.shippingAddress.phoneNumber || '',
  };
  
  const customerResult = await setCustomerForOrderMutation(customerData);
  
  if (customerResult.__typename === 'Order') {
    appState.activeOrder = customerResult as Order;
  } else if (customerResult.__typename === 'EmailAddressConflictError') {
    // Guest email matches existing account - fetch updated order
    appState.activeOrder = await getActiveOrderQuery();
  } else if (customerResult.__typename === 'GuestCheckoutError') {
    throw new Error('Guest checkout is not enabled.');
  } else if (customerResult.__typename === 'NoActiveOrderError') {
    throw new Error('No active order found.');
  } else {
    throw new Error('Failed to set customer for order.');
  }
}
// AUTHENTICATED - Order already has customer, do nothing
```

**Mutations/Queries:**
- Guest: `setCustomerForOrderMutation()` + possibly `getActiveOrderQuery()`
- Authenticated: None

**Time:**
- Authenticated: ~0ms
- Guest: ~400-700ms

**Benefits:**
- Customer is set immediately after order creation
- Clear separation: customer setup vs address setup
- `submitAddresses()` becomes simpler

---

### **Step 4: Submit Addresses & Shipping** (~679ms)
**Location:** `checkout/index.tsx` → `CheckoutAddresses.tsx`

**SIMPLIFIED** - No longer handles customer setup

```typescript
async submitAddresses() {
  // 1. Sync customer data to appState
  appState.customer = { ...customerForSync };
  
  // 2. Prepare address inputs
  const shippingAddressInput = { ... };
  const billingAddressInput = useDifferentBilling ? { ... } : undefined;
  
  // 3. Execute parallel address & shipping processing
  const checkoutResult = await CheckoutOptimizationService.optimizedCheckoutProcessing(
    shippingAddressInput,
    billingAddressInput,
    appState.activeOrder?.subTotalWithTax || 0
  );
  
  appState.activeOrder = checkoutResult.order;
  
  // 4. Save addresses to customer account (NON-BLOCKING for authenticated users)
  if (isAuthenticated) {
    // Fire and forget - don't await
    saveAddressesToCustomerAccount(shippingAddressInput, billingAddressInput);
  }
}
```

**Mutations/Queries:**
- `setOrderShippingAddressMutation()` - Set shipping address
- `setOrderBillingAddressMutation()` - Set billing address (optional)
- `setOrderShippingMethodMutation()` - Set shipping method

**Time:** ~679ms (down from ~2,217ms)

**Savings:** ~1,538ms

---

### **Step 5: Update PaymentIntent** (~1,353ms)
**Location:** `checkout/index.tsx`

**OPTIMIZED** - Use order from Step 4 instead of querying

```typescript
// Use appState.activeOrder instead of calling getActiveOrderQuery()
const currentOrder = appState.activeOrder;

if (selectedPaymentMethod.value === 'stripe' && currentOrder) {
  const paymentIntentId = (window as any).__stripePaymentIntentId;
  
  if (paymentIntentId && currentOrder.totalWithTax && currentOrder.code && currentOrder.id) {
    const stripeService = new StripePaymentService(...);
    
    await stripeService.updatePaymentIntentWithOrder(
      paymentIntentId,
      currentOrder.totalWithTax,
      currentOrder.code,
      parseInt(currentOrder.id)
    );
  }
}
```

**Mutations/Queries:**
- `getStripePublishableKeyQuery()` - Get Stripe key
- `updatePaymentIntentWithOrder()` - Update PaymentIntent

**Time:** ~1,353ms (no change, but eliminated one query)

**Savings:** ~289ms (eliminated `getActiveOrderQuery()`)

---

### **Step 6: Transition to ArrangingPayment** (~298ms)
**Location:** `checkout/index.tsx`

**No changes** - Same as current

---

### **Step 7: Trigger Payment** (~0ms)
**Location:** `checkout/index.tsx`

**OPTIMIZED** - Use transition result instead of querying

```typescript
// Use the order from the transition mutation instead of querying again
if (appState.activeOrder?.state === 'ArrangingPayment') {
  // Prefetch confirmation page
  if (appState.activeOrder.code) {
    await prefetchOrderConfirmation(appState.activeOrder.code);
  }
  
  // Trigger Stripe payment
  if (selectedPaymentMethod.value === 'stripe' && stripeTriggerSignal.value === 0) {
    stripeTriggerSignal.value++;
  }
}
```

**Mutations/Queries:**
- `prefetchOrderConfirmation()` - Prefetch confirmation page

**Time:** ~218ms (no change, but eliminated one query)

**Savings:** ~292ms (eliminated `getActiveOrderQuery()`)

---

### **Background: Save Addresses to Customer Account** (non-blocking)
**Location:** `CheckoutAddresses.tsx`

**NEW** - Runs in background, doesn't block checkout

```typescript
async function saveAddressesToCustomerAccount(
  shippingAddressInput: any,
  billingAddressInput: any
) {
  try {
    const customerAddresses = await getActiveCustomerAddressesQuery();
    const defaultShipping = customerAddresses?.addresses?.find(a => a.defaultShippingAddress);
    
    if (defaultShipping) {
      await updateCustomerAddress({ id: defaultShipping.id, ...shippingAddressInput });
    } else {
      await createCustomerAddress(shippingAddressInput);
    }
    
    if (billingAddressInput) {
      const defaultBilling = customerAddresses?.addresses?.find(a => a.defaultBillingAddress);
      if (defaultBilling && defaultBilling.id !== defaultShipping?.id) {
        await updateCustomerAddress({ id: defaultBilling.id, ...billingAddressInput });
      } else {
        await createCustomerAddress(billingAddressInput);
      }
    }
  } catch (error) {
    console.warn('Failed to save addresses to customer account (non-critical):', error);
  }
}
```

**Time:** ~400ms (but doesn't block checkout)

**Savings:** ~400ms (made non-blocking)

---

## 📊 Optimized Timing Breakdown

| Step | Description | Time | Change |
|------|-------------|------|--------|
| 1 | Validation | ~0ms | - |
| 2 | Convert cart to order | ~836ms | - |
| **3** | **Set customer (guest only)** | **~400ms** | **MOVED** |
| 4 | Submit addresses & shipping | ~679ms | ✅ -1,538ms |
| 5 | Update PaymentIntent | ~1,353ms | ✅ -289ms |
| 6 | Transition to ArrangingPayment | ~298ms | - |
| 7 | Prefetch & trigger payment | ~218ms | ✅ -292ms |
| Background | Save to customer account | ~0ms | ✅ -400ms (non-blocking) |
| **TOTAL** | | **~3,784ms** | **✅ -1,816ms (32% faster)** |

---

## 🎯 Summary of Changes

### Changes to `checkout/index.tsx` (placeOrder function)

1. **After Step 2 (cart conversion):** Add customer setup logic
   - Check `isAuthenticated = !!appState.customer.id`
   - If guest: call `setCustomerForOrderMutation()`
   - If authenticated: skip (order already has customer)

2. **Step 4 (before PaymentIntent update):** Remove `getActiveOrderQuery()`
   - Use `appState.activeOrder` directly

3. **Step 7 (before payment trigger):** Remove `getActiveOrderQuery()`
   - Use `appState.activeOrder` from transition mutation

### Changes to `CheckoutAddresses.tsx` (submitAddresses function)

1. **Remove customer setup logic** (lines 384-445)
   - No more authentication check
   - No more `setCustomerForOrderMutation()`
   - Just handle addresses

2. **Make customer address saving non-blocking** (lines 510-580)
   - Extract to separate function
   - Call without `await` (fire and forget)
   - Add try/catch for error handling

---

## 🚀 Expected Results

- **Current:** ~5.6 seconds
- **Optimized:** ~3.8 seconds
- **Improvement:** 1.8 seconds (32% faster)

### Breakdown by User Type:

**Authenticated Users:**
- Current: ~5.6s
- Optimized: ~3.4s (no customer setup, no blocking address save)
- Improvement: ~2.2s (39% faster)

**Guest Users:**
- Current: ~5.6s
- Optimized: ~3.8s (customer setup moved earlier, no address save)
- Improvement: ~1.8s (32% faster)

---

## ✅ Benefits

1. **Faster checkout** - 32% improvement overall
2. **Clearer code** - Customer setup separate from address setup
3. **Better UX** - Non-blocking operations don't delay payment
4. **Easier to maintain** - Linear flow, less nesting
5. **Fewer queries** - Eliminated 2 redundant `getActiveOrderQuery()` calls

---

## 🔄 Implementation Steps

1. Move customer setup logic from `CheckoutAddresses.tsx` to `checkout/index.tsx`
2. Simplify `submitAddresses()` to only handle addresses
3. Remove redundant `getActiveOrderQuery()` calls
4. Make customer address saving non-blocking
5. Test both authenticated and guest checkout flows
6. Verify timing improvements

---

**Ready to implement?**

