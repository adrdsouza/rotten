# Place Order Flow - Complete Map

**File:** `frontend/src/routes/checkout/index.tsx`  
**Function:** `placeOrder()`  
**Current Total Time:** ~5.6 seconds

---

## 📋 Current Flow (Step by Step)

### **Step 1: Validation** (~0ms)
**Location:** `checkout/index.tsx` lines 214-227

**What it does:**
- Validates customer info (email, firstName, lastName)
- Validates shipping address (streetLine1, city, province)
- Validates billing address (if different billing is used)

**Mutations/Queries:** None  
**Time:** ~0ms (in-memory validation)

---

### **Step 2: Convert Cart to Vendure Order** (~836ms)
**Location:** `checkout/index.tsx` lines 229-245  
**Calls:** `convertLocalCartToVendureOrder()`

**What it does:**
1. Validates stock
2. Calls `LocalCartService.convertToVendureOrder()`
   - Checks for existing order and clears its items
   - Calls `addItemsToOrderMutation()` to add cart items to order
   - **IMPORTANT:** If user is authenticated, Vendure automatically associates order with customer
   - **IMPORTANT:** If user is guest, order is created WITHOUT customer association
3. Returns the order
4. Sets `appState.activeOrder = vendureOrder`

**Mutations/Queries:**
- `getActiveOrderQuery()` - Check for existing order
- `removeOrderLineMutation()` - Clear existing items (if any)
- `addItemsToOrderMutation()` - Add cart items to order

**Time:** ~836ms  
**Result:** Order created with items, but guest orders have NO customer yet

---

### **Step 3: Submit Address Form** (~2,217ms)
**Location:** `checkout/index.tsx` lines 247-255  
**Calls:** `window.submitCheckoutAddressForm()` → `submitAddresses()`  
**File:** `frontend/src/components/checkout/CheckoutAddresses.tsx`

#### **3.1: Customer Sync** (~0.2ms)
**Lines:** 370-380

**What it does:**
- Syncs customer data to `appState.customer`

**Mutations/Queries:** None  
**Time:** ~0.2ms

#### **3.2: Authentication Check & Customer Setup** (~600ms for guest, ~0ms for authenticated)
**Lines:** 384-445

**Current Implementation:**
```typescript
const isAuthenticated = !!appState.customer.id;

if (isAuthenticated) {
  // ✅ AUTHENTICATED: Do nothing - order already has customer
  console.log('Authenticated user - order already has customer');
} else {
  // 🔓 GUEST: Set customer on order
  const customerResult = await setCustomerForOrderMutation(customerData);
  // Handle: Order, EmailAddressConflictError, AlreadyLoggedInError, etc.
}
```

**Mutations/Queries (Guest only):**
- `setCustomerForOrderMutation()` - Attach customer info to order (~400ms)
- `getActiveOrderQuery()` - Only if EmailAddressConflictError or AlreadyLoggedInError (~300ms)

**Time:**
- Authenticated: ~0ms
- Guest: ~400-700ms

#### **3.3: Parallel Address & Shipping Processing** (~679ms)
**Lines:** 447-508  
**Calls:** `CheckoutOptimizationService.optimizedCheckoutProcessing()`

**What it does:**
1. Prepares shipping address input
2. Prepares billing address input (if different)
3. Calls `CheckoutOptimizationService.processAddressAndShippingParallel()`:
   - **Parallel Operation 1:** `setOrderShippingAddressMutation()`
   - **Parallel Operation 2:** `setOrderBillingAddressMutation()` (if different billing)
   - **Sequential Operation:** `setOrderShippingMethodMutation()` (after addresses)

**Mutations/Queries:**
- `setOrderShippingAddressMutation()` - Set shipping address
- `setOrderBillingAddressMutation()` - Set billing address (optional)
- `setOrderShippingMethodMutation()` - Set shipping method (hardcoded ID based on country/total)

**Time:** ~679ms

#### **3.4: Save Addresses to Customer Account** (~300-500ms for authenticated only)
**Lines:** 510-580

**What it does (Authenticated users only):**
- Gets customer's existing addresses
- Updates or creates default shipping address
- Updates or creates default billing address (if different)

**Mutations/Queries (Authenticated only):**
- `getActiveCustomerAddressesQuery()` - Get existing addresses
- `updateCustomerAddress()` or `createCustomerAddress()` - Save shipping address
- `updateCustomerAddress()` or `createCustomerAddress()` - Save billing address (if different)

**Time:**
- Authenticated: ~300-500ms
- Guest: ~0ms (skipped)

**Total Step 3 Time:**
- Authenticated: ~0ms + ~679ms + ~400ms = **~1,079ms**
- Guest: ~400ms + ~679ms + ~0ms = **~1,079ms**

---

### **Step 4: Get Current Order** (~289ms)
**Location:** `checkout/index.tsx` lines 260-264

**What it does:**
- Fetches the current order from Vendure
- **WHY?** To get the latest order state before updating PaymentIntent

**Mutations/Queries:**
- `getActiveOrderQuery()` - Get current order

**Time:** ~289ms  
**❓ QUESTION:** Do we need this? We already have `appState.activeOrder` from Step 3

---

### **Step 5: Update PaymentIntent** (~1,353ms)
**Location:** `checkout/index.tsx` lines 266-307

**What it does:**
1. Gets PaymentIntent ID from `window.__stripePaymentIntentId`
2. Imports Stripe service and gets Stripe key
3. Calls `stripeService.updatePaymentIntentWithOrder()`:
   - Updates PaymentIntent amount
   - Updates PaymentIntent metadata (order code, order ID)
   - **OPTIMIZATION:** Combined into single API call (saves ~915ms)

**Mutations/Queries:**
- `getStripePublishableKeyQuery()` - Get Stripe key
- `updatePaymentIntentWithOrder()` - Update PaymentIntent (custom mutation)

**Time:** ~1,353ms

---

### **Step 6: Transition Order to ArrangingPayment** (~298ms)
**Location:** `checkout/index.tsx` lines 309-322

**What it does:**
- Transitions order state from `AddingItems` to `ArrangingPayment`
- This is required before payment can be processed

**Mutations/Queries:**
- `transitionOrderToStateMutation('ArrangingPayment')` - Transition order state

**Time:** ~298ms

---

### **Step 7: Get Latest Order** (~292ms)
**Location:** `checkout/index.tsx` lines 324-328

**What it does:**
- Fetches the order again to verify it's in `ArrangingPayment` state
- **WHY?** To ensure transition was successful

**Mutations/Queries:**
- `getActiveOrderQuery()` - Get latest order

**Time:** ~292ms  
**❓ QUESTION:** Do we need this? The transition mutation returns the updated order

---

### **Step 8: Prefetch Confirmation Page** (~218ms)
**Location:** `checkout/index.tsx` lines 333-338

**What it does:**
- Prefetches the order confirmation page for faster navigation after payment

**Mutations/Queries:**
- `prefetchOrderConfirmation()` - Prefetch confirmation page

**Time:** ~218ms

---

### **Step 9: Trigger Stripe Payment** (~0ms)
**Location:** `checkout/index.tsx` lines 340-346

**What it does:**
- Increments `stripeTriggerSignal` to trigger Stripe payment component
- Actual payment happens in `Payment.tsx` component

**Mutations/Queries:** None  
**Time:** ~0ms (just sets a signal)

---

## 📊 Current Timing Breakdown

| Step | Description | Time | Queries/Mutations |
|------|-------------|------|-------------------|
| 1 | Validation | ~0ms | 0 |
| 2 | Convert cart to order | ~836ms | 3 |
| 3.1 | Customer sync | ~0.2ms | 0 |
| 3.2 | Set customer (guest only) | ~400ms | 1-2 |
| 3.3 | Parallel address/shipping | ~679ms | 2-3 |
| 3.4 | Save to customer account (auth only) | ~400ms | 2-4 |
| 4 | Get current order | ~289ms | 1 |
| 5 | Update PaymentIntent | ~1,353ms | 2 |
| 6 | Transition to ArrangingPayment | ~298ms | 1 |
| 7 | Get latest order | ~292ms | 1 |
| 8 | Prefetch confirmation | ~218ms | 1 |
| 9 | Trigger payment | ~0ms | 0 |
| **TOTAL** | | **~5,600ms** | **14-18** |

---

## 🔴 Identified Issues

### Issue 1: Redundant `getActiveOrderQuery()` calls
- **Step 4:** Get current order (~289ms) - We already have it in `appState.activeOrder`
- **Step 7:** Get latest order (~292ms) - The transition mutation returns the updated order

**Potential Savings:** ~581ms

### Issue 2: Customer setup happens AFTER order creation
- Customer is set in Step 3.2 (inside address submission)
- Should happen immediately after Step 2 (cart conversion)

**Benefits of moving:**
- Clearer separation of concerns
- Simpler address submission logic
- Easier to understand flow

### Issue 3: Save to customer account could be async
- Step 3.4 saves addresses to customer account (~400ms)
- This doesn't block payment - could happen in background

**Potential Savings:** ~400ms (non-blocking)

---

## 💡 Proposed Optimized Flow

See `docs/PLACE_ORDER_FLOW_OPTIMIZED.md` for the re-engineered flow.

