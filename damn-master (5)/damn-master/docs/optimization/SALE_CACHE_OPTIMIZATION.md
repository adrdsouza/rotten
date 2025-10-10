# Sale Cache Optimization System

## Overview
Implemented a static file-based cache system to eliminate GraphQL calls for checking product sale status, dramatically improving shop page performance.

## Problem
- Shop page was making individual `getProductById` GraphQL calls for each product to check for sale prices
- This caused significant performance bottlenecks, especially with 24+ products loading
- Each product required a separate API call to check `variant.customFields.salePrice`

## Solution
- **Static JSON Cache**: Created `/frontend/src/data/sale-products.json` with product IDs that have sale items
- **Utility Functions**: Built `/frontend/src/utils/sale-cache.ts` for instant lookups
- **Zero API Calls**: Replaced all GraphQL calls with in-memory Set lookups

## Implementation

### 1. Sale Products Cache File
```json
{
  "saleProductIds": ["1", "2", "3"],
  "lastUpdated": "2024-01-15T00:00:00Z",
  "note": "Manually maintained list of product IDs that have sale items"
}
```

### 2. Cache Utility Functions
- `getSaleProductsSet()`: Returns Set of sale product IDs
- `hasProductSale(productId)`: Check single product
- `getBulkSaleStatus(productIds[])`: Check multiple products at once

### 3. Shop Page Integration
- Modified `extractSerializableSearchData()` to use static cache
- Eliminated all `getProductById` calls for sale checking
- Instant O(1) lookup performance

## Performance Impact
- **Before**: Multiple GraphQL calls per page load (24+ API calls)
- **After**: Zero GraphQL calls for sale data (instant lookup)
- **Result**: Significantly faster page load times

## Maintenance
1. **Manual Updates**: Edit `/frontend/src/data/sale-products.json` when products go on/off sale
2. **Add Product**: Add product ID to `saleProductIds` array
3. **Remove Product**: Remove product ID from array
4. **Update Timestamp**: Change `lastUpdated` field

## Future Enhancements
- Could add automated script to regenerate cache from database
- Could implement cache invalidation strategies
- Could add admin interface for cache management

## Files Modified
- `/frontend/src/data/sale-products.json` (new)
- `/frontend/src/utils/sale-cache.ts` (new)
- `/frontend/src/routes/shop/index.tsx` (modified)
- `/frontend/src/providers/shop/products/products.ts` (modified)

## Benefits
✅ **Zero GraphQL calls** for sale data  
✅ **Instant performance** with O(1) lookups  
✅ **Simple maintenance** via JSON file  
✅ **Scalable solution** for any number of products  
✅ **No database load** for sale checking