# New Cart Architecture - Local Storage Until Checkout

## The Problem We're Solving

**Current Issue**: Orders are created in Vendure backend immediately when users click "Add to Cart". This causes:
- Abandoned orders in the database when users browse but don't complete purchase
- Complex stock validation during cart operations
- Unnecessary backend calls for cart quantity changes
- Stock level conflicts for browsing users

**Current Implementation Analysis**:
- Cart already has sophisticated stock validation logic in `CartContents.tsx`
- Stock levels are hardcoded to '3' but system is designed to handle dynamic stock
- Quantity options are cached and calculated based on stock levels
- Product names are fetched and cached for display
- Frontend already caps quantities at available stock levels

## The Solution

**New Architecture**: Keep cart in localStorage until customer hits "Place Order", then create Vendure order only when customer actually commits to purchase. **Preserve existing stock validation and caching logic**.

## Flow Comparison

### Old Flow (Problematic - Creates Abandoned Orders)
1. Product page: Click "Add to Cart" → `addItemToOrderMutation(variantId, 1)` → Creates Vendure Order immediately
2. Cart: Change quantity → `adjustOrderLineMutation(lineId, quantity)` → Modifies backend order with 300ms debounce
3. Checkout flow: Order already exists, just collect shipping/payment info
4. Result: **Hundreds of abandoned orders** from testing, browsing, incomplete checkouts

### New Flow (Better - No Abandoned Orders)
1. Product page: Click "Add to Cart" → `LocalCartService.addItem()` → localStorage only
2. Cart: Change quantity → `LocalCartService.updateItemQuantity()` → localStorage only  
3. Checkout flow: Fill shipping, billing, payment info → **still localStorage**
4. **ONLY** when clicking "Place Order" → `LocalCartService.convertToVendureOrder()` → Creates real order
5. Result: **Zero abandoned orders** - only successful purchases create database records

## Implementation Strategy

### Key Requirements
1. **Preserve Current Cart Logic**: Stock validation, quantity caching, product name caching
2. **Move Order Creation**: Only create Vendure orders at checkout, not "add to cart"
3. **Maintain Live Stock Checks**: Continue querying stock levels for cart items
4. **Keep Current UX**: Same quantity selectors, same validation behavior

### Files to Modify

#### 1. **LocalCartService** (New)
```typescript
interface LocalCartItem {
  productVariantId: string;
  quantity: number;
  productVariant: ProductVariant;
  stockLevel?: string;
  maxQuantityOptions?: number[];
  productName?: string;
}

class LocalCartService {
  // Core cart operations
  addItem(item: LocalCartItem): void
  updateItemQuantity(variantId: string, quantity: number): void
  removeItem(variantId: string): void
  
  // Stock validation (preserve current logic)
  async refreshStockLevels(): Promise<void>
  calculateQuantityOptions(stockLevel: string, currentQuantity: number): number[]
  
  // Product data caching (preserve current logic)
  async refreshProductNames(): Promise<void>
  
  // Checkout conversion
  async convertToVendureOrder(): Promise<Order | null>
}
```

#### 2. **CartContext** (New)
Qwik context providing reactive cart state with same interface as current Vendure cart.

#### 3. **CartContents.tsx** (Modify)
- Remove `adjustOrderLineMutation` calls
- Replace with `LocalCartService.updateItemQuantity`
- **Keep all existing**: quantity options caching, product name caching, stock validation
- **Keep same UX**: quantity selectors, 300ms debounce for updates

#### 4. **Product Page** (Modify)
- Replace `addItemToOrderMutation` with `LocalCartService.addItem`
- **Keep existing**: stock level checks, quantity display logic
- **Keep same UX**: "Add to Cart" button states, loading indicators

#### 5. **Checkout Flow** (New)
- **Entire checkout stays in localStorage** - shipping, billing, payment info collection
- Add `convertToVendureOrder()` call **only when "Place Order" button is clicked**
- Handle stock validation errors gracefully at order creation time
- Only create database order when customer actually commits to purchase

## Migration Strategy

### Phase 1: Create New Local Cart System
- Create `LocalCartService` with same validation logic as current cart
- Create `CartContext` for reactive state management
- Implement localStorage persistence with stock level caching

### Phase 2: Update Product Pages
- Replace `addItemToOrderMutation` calls with `LocalCartService.addItem`
- **Preserve**: All current stock checking and quantity display logic
- **Keep same UX**: Button states, loading indicators, quantity display

### Phase 3: Update Cart Components
- Replace `adjustOrderLineMutation` calls with `LocalCartService.updateItemQuantity`
- **Preserve**: 300ms debounce, quantity options caching, product name caching
- **Keep same UX**: Quantity selectors, stock validation, trash icons

### Phase 4: Add Checkout Conversion
- **Keep entire checkout in localStorage** until "Place Order"
- Add `convertToVendureOrder()` call **only on "Place Order" button click**
- Handle stock validation errors during conversion
- Only create database order when customer actually commits to purchase

### Phase 5: Testing & Validation
- Test stock validation during localStorage operations
- Test order conversion at checkout
- Verify no abandoned orders are created during browsing

### Phase 6: Cleanup
- Remove unused Vendure cart mutations from browsing flows
- Keep order mutations only for checkout and post-checkout operations

## Benefits

1. **Better Performance**: No backend calls during browsing
2. **Cleaner Database**: Only committed buyers create orders
3. **Simpler Stock Validation**: Only validate when actually ordering
4. **Better UX**: Instant cart operations without API wait times
5. **Reduced Server Load**: Fewer unnecessary API calls

## Stock Validation Strategy (Preserving Current Logic)

### Current Implementation (Keep This)
- Cart queries stock levels for each line item
- Hardcoded to `stockLevel = '3'` but designed for dynamic values
- Quantity options calculated: `Math.min(stockLevel, 8)` and `Math.max(maxQty, currentQuantity)`
- Options cached per line ID to avoid recalculation
- Frontend caps quantities at available stock

### Enhanced Implementation
- **Same validation logic** but applied to localStorage cart items
- Stock levels refreshed periodically for cart items
- Stock validation during `convertToVendureOrder()` before backend creation
- Graceful handling of stock changes between adding to cart and checkout

### Error Handling
- **During Browsing**: Same as current - cap quantities, show available stock
- **During Checkout**: Validate stock, adjust quantities if needed, show clear error messages
- **Stock Changes**: Refresh stock levels, update quantity options, notify user

## Example Usage

### Adding to Cart (Product Page - Preserve Current UX)
```typescript
// Current way (creates Vendure order immediately)
const addItemToOrder = await addItemToOrderMutation(variantId, 1);
appState.activeOrder = addItemToOrder as Order;

// New way (localStorage only, same UX)
const cart = useLocalCart();
await cart.addItem({
  productVariantId: variantId,
  quantity: 1,
  productVariant: selectedVariant.value,
  stockLevel: selectedVariant.value.stockLevel // preserve stock checking
});
// Same result: cart shows item, quantities are validated, stock is checked
```

### Cart Operations (Preserve Current Logic)
```typescript
// Current way (immediate backend call with 300ms debounce)
currentOrderLineSignal.value = { id: line.id, value: newQuantity };
// → triggers adjustOrderLineMutation after 300ms

// New way (localStorage update with same debouncing)
cart.updateItemQuantity(line.productVariantId, newQuantity);
// Same UX: 300ms debounce, quantity validation, stock checking
```

### Checkout Process (New Step)
```typescript
// New checkout flow - localStorage until "Place Order"
const cart = useLocalCart();

// Steps 1-3: All in localStorage
// 1. Collect shipping address → store in localStorage
// 2. Collect billing address → store in localStorage  
// 3. Collect payment info → store in localStorage

// Step 4: ONLY when "Place Order" is clicked
const handlePlaceOrder = async () => {
  // Convert localStorage cart to Vendure order
  const order = await cart.convertToVendureOrder();
  
  if (order) {
    // Apply shipping/billing/payment to the new order
    await setOrderShippingAddress(order.id, shippingData);
    await setOrderBillingAddress(order.id, billingData);
    await processPayment(order.id, paymentData);
  } else {
    // Handle stock validation errors
    showStockAdjustmentDialog();
  }
};
```

## Next Steps

1. Implement LocalCartService (✅ Done)
2. Create CartContext (✅ Done)
3. Update product pages to use local cart
4. Update cart UI components
5. Modify checkout flow to convert local cart to order
6. Test and validate the new flow
7. Remove old cart mutations from browsing flows

This architecture change will eliminate the core issue and provide a much cleaner, more performant cart experience.
