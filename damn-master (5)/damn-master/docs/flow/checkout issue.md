Let's break down what's going on, why your adjustments led to breakage, and what the right, idiomatic Qwik approach is for cart/order state in a Vendure storefront.

1. Comparison: Your Current vs. Vendure Starter Approach
Your Current Checkout Page (routes/checkout/index.tsx):
You use a global appState (from Qwik context) for the order, and a local state for the step.
You previously tried to pass orderState or order as a prop to CartContents, but now you just render <CartContents /> (no props).
The cart drawer also just renders <CartContents /> (no props).
Vendure Starter Approach:
The starter always renders <CartContents /> without passing the order directly as a prop.
CartContents gets the order from appState.activeOrder via context.
2. Why Did It Break When You Adjusted AddressForm, CartContents, and Shipping?
Root Cause:
The original CartContents component is designed to get its data from context (appState.activeOrder), not from props.
When you tried to pass order, orderState, or similar props to CartContents, you created a mismatch between how the component expects to get its data and how you were providing it.
If you changed the signature of CartContents (e.g., to accept an order prop), but other places (like the cart drawer) still used it without props, you'd get type errors or runtime bugs.
If you reverted CartContents to use context, but your code still tried to pass it props, you'd get TypeScript errors like you saw.
What Qwik and Vendure Expect:
Global order state (cart/order) is held in a context (appState.activeOrder) and accessed by components via useContext(APP_STATE).
Components like CartContents should always pull from context, not from props, unless you have a strong reason to do otherwise.
Only pass props if you want to render a different order than the global one (rare in most e-commerce flows).
3. What is the Right Way? (Best Practices from Qwik Docs & E-commerce Patterns)
State Management:
Use Qwik's context (useContext) for global, cross-cutting state like the cart/order.
Use local useStore or signals for UI state (e.g., which checkout step is active).
Component Usage:
CartContents should always access the order via context, not via props.
The cart drawer, checkout summary, and anywhere else that needs the cart should simply render <CartContents />.
Why?
This ensures all parts of your app always show the same, up-to-date cart/order.
It avoids prop-drilling and keeps your code DRY and idiomatic.
It matches both the Vendure starter and Qwik's own recommendations for global state.
4. How to Fix & Prevent Future Issues
Do NOT pass order or orderState as a prop to CartContents unless you refactor the entire app to do so everywhere (not recommended).
Restore CartContents to always use context for its order data.
In all usages (checkout, cart drawer, etc.), just use <CartContents />.
If you need to show a different order (e.g., for an admin order view), then and only then, refactor to accept an order prop everywhere.
Your current code (as pasted above) is now correct and matches the starter.
If you keep it this way, you won't get prop/type errors, and all cart/order displays will stay in sync.

5. Summary Table
| Place | How to use CartContents | How it gets order data | |-------------------|-------------------------------|----------------------------------| | Cart Drawer | <CartContents /> | From appState.activeOrder | | Checkout Summary | <CartContents /> | From appState.activeOrder | | Admin/Other Order | <CartContents order={order}> | Only if you refactor everywhere |

6. References
Qwik Context Docs
Vendure Qwik Starter Example
Qwik E-commerce Example
7. Why Did Adjusting AddressForm, CartContents, Shipping Break It?
Changing how cart/order state is accessed (context vs. props) in only some places causes type errors and out-of-sync UI.
Consistency is key: always use context for global order/cart state in all components unless you have a very good reason not to.
If you keep your code as shown in your last message, you are doing it the right way.
If you want, I can help you audit your CartContents and related files to ensure they're always using context and not expecting props. Let me know if you'd like that!