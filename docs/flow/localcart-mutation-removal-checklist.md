# Local Cart Mutation Removal Checklist

**Goal:** Ensure NO backend mutations (customer, address, coupon, order) are called in local cart mode until `convertLocalCartToVendureOrder` is triggered on Place Order.

---

## 1. Customer/Address Mutations

### `/src/components/checkout/CheckoutAddresses.tsx`
- [ ] Remove/guard all calls to:
  - `setCustomerForOrderMutation` (line ~373)
  - `setOrderShippingAddressMutation` (line ~385)
  - `setOrderBillingAddressMutation` (line ~403)
- [ ] Ensure all customer/address data is written only to local cart state in local cart mode

### `/src/components/auto-shipping-selector/AutoShippingSelector.tsx`
- [ ] Remove/guard call to `setOrderShippingAddressMutation` (line ~89) in local cart mode


## 2. Coupon Mutations

### `/src/components/cart-totals/CartTotals.tsx`
- [ ] Remove/guard call to `applyCouponCodeMutation` (line ~126) in local cart mode
- [ ] Ensure coupon logic is handled only by `LocalCartService` in local cart mode


## 3. Payment Mutations

### `/src/providers/shop/checkout/checkout.ts`
- [ ] Ensure `addPaymentToOrderMutation` and related payment mutations are only called after backend order creation


## 4. General
- [ ] Audit all checkout/cart components for any other premature backend mutation calls
- [ ] All validation, error messaging, and UI progression must use local cart state until Place Order

---

## 5. Implementation Steps
- [ ] Refactor code to update only local cart state until Place Order
- [ ] Move all backend mutation calls to `convertLocalCartToVendureOrder`
- [ ] Test checkout flow to confirm no network calls until Place Order

---

**Status:**
- [ ] Checklist created
- [ ] Code refactoring in progress
- [ ] All premature backend mutations removed
- [ ] Ready for final testing

---

*Update this checklist as you complete each step and refactor each file.*
