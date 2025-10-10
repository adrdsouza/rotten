# Shop Component Refactor - Summary & Next Steps

## Date: 2025-10-09

---

## ✅ What We Achieved

### 1. **Fixed Critical Performance Issue: Button Activation Delay**

**Problem**: Shop buttons took too long to become active because stock checking only happened when the shop section entered the viewport.

**Solution**: 
- Replaced `useVisibleTask$` with `useResource$` for Phase 1 stock checking
- Stock checking now runs immediately on page load (not viewport-dependent)
- Follows Qwik best practices for data fetching

**Result**: Buttons activate much faster, providing better UX

---

### 2. **Fixed Variant Featured Image Loading**

**Problem**: 
- GraphQL query was using invalid `variant(id: $variantId)` pattern that doesn't exist in Vendure Shop API
- Error: `Invalid request` when loading variant featured images
- Result: `🖼️ Warmed 0 variant featured images`

**Solution**:
- Fixed GraphQL queries to use correct Vendure pattern: `product(id: "1")` and `product(id: "3")`
- Changed from slugs to IDs for better performance
- Updated both `GET_VARIANT_FEATURED_IMAGES` and `GET_VARIANT_GALLERY` queries
- Modified `loadVariantFeaturedImage()` and `loadVariantGallery()` functions to search through both products' variants
- Added placeholder image fallback (`/asset_placeholder.webp`) when no variant featured image exists

**Files Modified**:
- `frontend/src/services/shop-queries.ts` - Fixed all variant queries
- `frontend/src/components/shop/ShopComponent.tsx` - Added placeholder fallback logic

**Result**: Variant featured images now load correctly, with placeholder for missing images

---

### 3. **Added Comprehensive Timing Logs**

**Implementation**: Added detailed performance logging across all 4 phases of the shop component:

- **Phase 1**: Stock check + product featured image warming (using `useResource$`)
- **Phase 2**: Style selection - product featured image + gallery loading
- **Phase 3**: Size selection - variant stock check + variant featured image warming
- **Phase 4**: Color selection - variant featured image display + gallery loading

**Log Format**:
```
🚀 Phase X START: [description]
🖼️ [Action] loaded in XXms
💾 [Action] from cache in XXms
✅ [Success message]
⚠️ [Warning message]
❌ [Error message]
🏁 Phase X COMPLETE in XXms
```

**Purpose**: Identify performance bottlenecks and optimize loading times

---

### 4. **Fixed Image Display: Fill Container Completely**

**Problem**: Product images had gaps on the sides because they weren't filling the 4:5 aspect ratio container

**Solution**: Changed main product image from `object-contain` to `object-cover`

**Files Modified**:
- `frontend/src/components/shop/SizeColorSelection-v2.tsx` - Line 170: Changed to `object-cover`

**Result**: All images now fill the entire 4:5 container, even if aspect ratio doesn't match perfectly

---

## 📊 Current Shop Architecture

### Hardcoded Data Structure
- **2 Products**: Short sleeve (ID: "1"), Long sleeve (ID: "3")
- **3 Sizes**: Small, Medium, Large
- **9 Colors**: Midnight black, Charcoal grey, Navy blue, Forest green, Burgundy, Rust orange, Mustard yellow, Olive green, Cream
- **54 Total Variants**: 27 per product (3 sizes × 9 colors)

### 4-Phase Progressive Loading
1. **Phase 1 (Page Load)**: Stock check + product featured image warming - **NOW USING `useResource$`**
2. **Phase 2 (Style Selected)**: Show product featured image, load gallery
3. **Phase 3 (Size Selected)**: Check variant stock, warm variant featured images
4. **Phase 4 (Color Selected)**: Show variant featured image (or placeholder), load variant gallery

### LocalStorage Caching
- **Images**: 24-hour cache
- **Stock**: No caching (always fresh)
- **Cache Keys**: Separate for product/variant featured images and galleries

---

## 🔧 Technical Details

### GraphQL Query Patterns (Fixed)
```graphql
# ✅ CORRECT - Query through products using IDs
query GetVariantStock {
  shortsleeve: product(id: "1") {
    id
    variants {
      id
      stockLevel
    }
  }
  longsleeve: product(id: "3") {
    id
    variants {
      id
      stockLevel
    }
  }
}
```

### Qwik Best Practices Applied
- ✅ `useResource$` for data fetching (immediate execution, built-in loading states)
- ✅ Proper error handling and loading states
- ✅ SSR-friendly patterns
- ❌ **NOT YET FIXED**: Trigger pattern anti-pattern (8+ `useVisibleTask$` watchers) - see "Known Issues" below

---

## 🚨 Known Issues & Technical Debt

### 1. **Trigger Pattern Anti-Pattern** (NOT YET FIXED)
**Location**: `frontend/src/components/shop/ShopComponent.tsx` lines 388-416

**Problem**: Using 8+ `useVisibleTask$` watchers with trigger signals instead of direct event handlers

**Current Pattern** (Anti-pattern):
```typescript
// Parent component
const styleSelectTrigger = useSignal<'short' | 'long' | null>(null);

// Child component triggers
styleSelectTrigger.value = 'short';

// Parent watches for trigger
useVisibleTask$(({ track }) => {
  track(() => styleSelectTrigger.value);
  if (styleSelectTrigger.value) {
    handleStyleSelect(styleSelectTrigger.value);
    styleSelectTrigger.value = null;
  }
});
```

**Correct Pattern** (Should use):
```typescript
// Pass handler directly to child
<ChildComponent onStyleSelect$={handleStyleSelect} />

// Child calls handler directly
props.onStyleSelect$('short');
```

**Impact**: 
- More complex than necessary
- Harder to maintain
- Not following Qwik best practices
- Should be refactored but deferred to focus on immediate user issues

---

## 📝 Files Modified in This Session

1. `frontend/src/components/shop/ShopComponent.tsx`
   - Replaced `useVisibleTask$` with `useResource$` for Phase 1
   - Added comprehensive timing logs across all phases
   - Added placeholder image fallback for missing variant images

2. `frontend/src/services/shop-queries.ts`
   - Fixed `GET_VARIANT_STOCK` query (slug → ID)
   - Fixed `GET_VARIANT_FEATURED_IMAGES` query (invalid pattern → correct pattern, slug → ID)
   - Fixed `GET_VARIANT_GALLERY` query (invalid pattern → correct pattern)
   - Updated `loadVariantFeaturedImage()` function
   - Updated `loadVariantGallery()` function

3. `frontend/src/components/shop/SizeColorSelection-v2.tsx`
   - Changed main product image from `object-contain` to `object-cover`

---

## 🎯 Next Steps: Cart & Checkout Refactor

### Priority 1: Review Current Cart Implementation
- [ ] Analyze `frontend/src/services/LocalCartService.ts`
- [ ] Review cart state management in `frontend/src/providers/shop/orders/order.ts`
- [ ] Check cart UI components in `frontend/src/components/cart-*`
- [ ] Identify performance bottlenecks and anti-patterns

### Priority 2: Checkout Flow Optimization
- [ ] Review `frontend/src/routes/checkout/index.tsx`
- [ ] Analyze `frontend/src/components/checkout/CheckoutAddresses.tsx`
- [ ] Review `frontend/src/components/checkout/CheckoutForm.tsx`
- [ ] Check payment integration in `frontend/src/components/payment/Payment.tsx`
- [ ] Identify unnecessary re-renders and optimize

### Priority 3: Apply Qwik Best Practices
- [ ] Replace any `useVisibleTask$` used for data fetching with `useResource$`
- [ ] Remove trigger pattern anti-patterns if present
- [ ] Ensure proper use of `useTask$` for side effects
- [ ] Optimize component props and event handlers

### Priority 4: Performance Optimization
- [ ] Add timing logs similar to shop component
- [ ] Implement proper caching strategies
- [ ] Optimize GraphQL queries
- [ ] Reduce sequential operations, maximize parallel loading

### Priority 5: Testing & Validation
- [ ] Test cart add/remove/update operations
- [ ] Test checkout flow end-to-end
- [ ] Test payment integration with Stripe test keys
- [ ] Verify proper error handling and loading states

---

## 🔍 Questions to Answer in Next Session

1. **Cart State Management**: Is the cart using proper Qwik patterns or legacy React patterns?
2. **Checkout Performance**: Are there viewport-dependent operations that should run immediately?
3. **Payment Flow**: Is the Stripe integration following best practices?
4. **Data Fetching**: Are all GraphQL queries using correct Vendure patterns?
5. **Caching**: Is there proper caching for cart/checkout data?

---

## 📚 Key Learnings & Patterns

### Qwik Data Fetching Best Practices
- **`useResource$`**: For data fetching (runs immediately, built-in loading states, SSR-friendly)
- **`useTask$`**: For side effects and reactive updates based on tracked signals
- **`useVisibleTask$`**: ONLY for viewport-dependent operations (analytics, lazy loading below fold)

### Vendure GraphQL Patterns
- **No Direct Variant Query**: Must query through products
- **Use IDs over Slugs**: Better performance
- **Query Pattern**: `product(id: "X") { variants { ... } }`

### Image Optimization
- **`object-cover`**: Fill container completely (crop if needed)
- **`object-contain`**: Show entire image (may have gaps)
- **Aspect Ratio**: Use `aspect-4/5` for consistent containers
- **Placeholder**: Always have fallback for missing images

---

## 🛠️ Useful Commands

```bash
# Build and deploy
cd /home/vendure/rottenhand/frontend
pnpm run build

# Check for errors
pnpm lint

# View PM2 processes
pm2 list

# Restart storefront
pm2 restart store

# View logs
pm2 logs store
```

---

## 📞 Context for Next Session

**Current State**: Shop component is fully functional with proper data fetching, timing logs, and image display. All builds passing.

**Next Focus**: Cart and checkout refactor to apply the same optimization patterns and best practices.

**Key Files to Start With**:
1. `frontend/src/services/LocalCartService.ts`
2. `frontend/src/providers/shop/orders/order.ts`
3. `frontend/src/routes/checkout/index.tsx`
4. `frontend/src/components/checkout/CheckoutAddresses.tsx`

**Testing URL**: http://localhost:4000 (storefront)

---

## 💡 Additional Notes

- User prefers **pnpm** (never npm)
- User will handle browser interactions (never use `open-browser` tool)
- Always test GraphQL queries with MCP before deploying
- Follow the coding guidelines in `.augment/rules/coding-guidelines.md`
- Use timing logs to identify performance bottlenecks
- Prioritize user-reported issues over architectural refactoring

