- Modern, frictionless checkout UX
- No abandoned/incomplete orders in Vendure backend
- All validation is local until final submission
- Only real, confirmed orders reach Vendure/admin

---

## 1. On Page Load
- Geolocate user’s country
- Load cart from localStorage/app state (redirect if empty)
- Query backend for shipping price/options for detected country

## 2. User Interaction
- User can edit cart, address, and payment info at any time
- If country changes, re-query shipping price/options
- Show gentle validation hints on blur (optional, not required)

## 3. On “Place Order” Click
- Validate all fields (cart, address, payment) locally
- If valid, send all info to backend:
  - Create order in Vendure
  - Set customer, address, shipping, payment
  - Process payment
- If errors, show them for user to fix

## 4. On Success
- Show confirmation page
- Clear cart from localStorage

---

## Validation Philosophy
- Gentle hints for required/format fields after blur (optional)
- Only block submission and show all errors on “Place Order”

---

## Shipping Price Logic
- Any time country changes (geolocation or user selection):
  - Query backend for available shipping methods/prices for country & subtotal
  - Update cart totals immediately

---

## Cart Persistence
- Cart is always stored in localStorage/app state
- Checkout page loads cart from local
- If cart is empty, redirect user to shop

---

## Privacy & Backend
- No personal data sent to Vendure until “Place Order”
- Only confirmed orders reach backend/admin

---

## Edge Cases
- If a cart item becomes invalid (e.g., out of stock), handle gracefully at “Place Order”
- If payment provider requires pre-authorization, handle before sending order to Vendure

---

## Summary Table
| Step                | Backend Involved? | UX/Validation         | Notes                                 |
|---------------------|------------------|-----------------------|---------------------------------------|
| Page load           | Yes (shipping)   | None                  | Geolocate, fetch shipping price       |
| Edit fields         | No               | Optional gentle hints | Cart/address/payment in local state   |
| Country change      | Yes (shipping)   | None                  | Update shipping price instantly       |
| Place Order         | Yes (all)        | Full validation       | Create order, process payment         |
| Confirmation        | No               | -                     | Show success, clear cart              |

---

## Next Steps
- Backup current checkout file
- Scaffold new `/src/routes/checkout/index.tsx` with this logic
- Add clear comments and hooks for shipping queries and order creation
- Test thoroughly and iterate

---

## File Impact & Migration Plan

### Files to be Created
- `/src/routes/checkout/index.tsx`  
  (New, simplified checkout page. The current file will be backed up before replacement.)

### Files to be Modified
- **Cart State Management:**  
  If your cart logic is in a dedicated file (e.g., `/src/store/cart.ts`, `/src/context/CartContext.tsx`, or similar), ensure it persists cart data in localStorage and exposes it to the checkout page.
  If country/geolocation logic is in a shared utility or context, it may be reused and/or slightly refactored for the new flow.
- **Shipping Price Fetching:**  
  Any utility or service used to fetch shipping prices (e.g., `/src/providers/shop/orders/order.ts` or a custom API utility) will be called directly from the new checkout page, but not for order creation.
- **Payment Integration:**  
  If you have a payment utility or component (e.g., Stripe integration), it will be used in the new checkout but with local state until final submit.

### Files to be Deprecated/Unused
- Any code in the old `/src/routes/checkout/index.tsx` that:
  - Creates or updates orders in Vendure before “Place Order.”
  - Handles step-based UI logic (stepper, gating, etc.).
  - Handles backend-driven validation before submit.
- Components tightly coupled to the old step-based flow (e.g., stepper navigation, “Next”/“Back” buttons, gating logic in Shipping/Payment components) may be removed or refactored.

### Files Unaffected
- Product pages, shop browsing, and cart adding logic (unless you want to refactor cart persistence).
- Account, order history, and other unrelated routes.
- Most backend/admin logic, except that you’ll see fewer abandoned/incomplete orders.

---

## Summary Table: File Impact

| File/Component                                 | Action/Status     | Notes                                                      |
|------------------------------------------------|-------------------|------------------------------------------------------------|
| `/src/routes/checkout/index.tsx`               | Replaced          | Old file backed up, new file created with new logic        |
| Cart state/store/context (if exists)           | May be updated    | Ensure localStorage persistence and correct API            |
| Shipping price fetch utility                   | May be reused     | Used for shipping quote on country change                  |
| Payment integration (Stripe, etc.)             | Reused            | Used in new flow, local state until submit                 |
| Stepper/step-based components                  | Deprecated        | Remove or refactor as needed                               |
| Product, shop, account, unrelated routes       | Unaffected        | No change                                                  |
| Backend/admin panel                            | Unaffected        | Will see fewer abandoned/incomplete orders                 |
