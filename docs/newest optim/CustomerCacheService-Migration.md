# CustomerCacheService Migration Guide

## Overview

This migration replaces the inefficient multiple cached GraphQL queries with a unified CustomerCacheService that caches until invalidated, eliminating artificial TTL expiry and improving performance.

## What Changed

### Before (Old System)
- 3 separate cached functions with duplicate logic
- Artificial 3-minute TTL expiry
- Manual cache management with Map and timestamps
- Cache cleared entirely on any mutation

### After (New System)
- Single unified CustomerCacheService
- Cache-until-invalidated approach
- Cross-tab synchronization
- Selective cache invalidation
- Better error handling with stale data fallback

## API Changes

### Function Signatures (No Changes Required)

The public API remains the same, so existing code continues to work:

```typescript
// These functions work exactly the same
export const getActiveCustomerCached = () => customerCache.getProfile();
export const getActiveCustomerAddressesCached = () => customerCache.getAddresses();
export const getActiveCustomerOrdersCached = () => customerCache.getOrders();
export const clearCustomerCacheAfterMutation = () => customerCache.invalidateAll();
```

### New Features Available

```typescript
import { customerCache } from '~/services/CustomerCacheService';

// Subscribe to cache changes
const unsubscribe = customerCache.subscribe(() => {
  console.log('Customer cache updated');
});

// Selective invalidation
customerCache.invalidate('profile'); // Only invalidate profile
customerCache.invalidate('addresses'); // Only invalidate addresses

// Cache statistics for debugging
console.log(customerCache.getStats());

// Clear all cache (logout)
customerCache.clear();
```

## Files Modified

### 1. `/src/services/CustomerCacheService.ts` (New)
- Unified cache service with cache-until-invalidated logic
- Cross-tab synchronization via localStorage events
- Subscriber pattern for reactive updates
- Error handling with stale data fallback

### 2. `/src/providers/shop/customer/customer.ts` (Updated)
- Removed old cache implementation (Map + TTL)
- Updated imports to use CustomerCacheService
- All mutation functions now properly invalidate cache
- Logout function clears all customer cache

## Benefits

### Performance Improvements
- **Eliminated unnecessary refetches**: No more 3-minute artificial expiry
- **Reduced network requests**: Cache persists until data actually changes
- **Faster UI updates**: Instant cache hits for unchanged data

### Code Quality
- **Single responsibility**: One service handles all customer caching
- **Reduced duplication**: No more repeated cache logic in 3 functions
- **Better error handling**: Graceful fallback to stale data
- **Cross-tab sync**: Consistent cache state across browser tabs

### Developer Experience
- **Debugging tools**: Cache statistics and inspection
- **Reactive updates**: Subscribe to cache changes
- **Selective invalidation**: Invalidate only what changed

## Migration Checklist

### Automatic (No Action Required)
- ✅ Existing `getActiveCustomerCached()` calls continue working
- ✅ Existing `getActiveCustomerAddressesCached()` calls continue working
- ✅ Existing `getActiveCustomerOrdersCached()` calls continue working
- ✅ Existing `clearCustomerCacheAfterMutation()` calls continue working

### Optional Enhancements
- [ ] Add cache change subscriptions where reactive updates are needed
- [ ] Use selective invalidation for more granular cache control
- [ ] Add cache statistics to admin/debug panels
- [ ] Consider extending pattern to other data types (products, orders)

## Testing

### Verify Cache Behavior
```typescript
// Test cache persistence
const customer1 = await getActiveCustomerCached();
const customer2 = await getActiveCustomerCached(); // Should be instant (cached)
console.log(customer1 === customer2); // Should be true

// Test cache invalidation
await updateCustomerMutation({ firstName: 'New Name' });
const customer3 = await getActiveCustomerCached(); // Should refetch
console.log(customer3.firstName); // Should be 'New Name'
```

### Cross-Tab Testing
1. Open app in two browser tabs
2. Update customer data in tab 1
3. Verify tab 2 automatically invalidates cache
4. Verify both tabs show updated data

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Restore the old `customer.ts` implementation
2. Remove `CustomerCacheService.ts`
3. Update imports back to old cache functions

However, the new system is thoroughly tested and provides significant benefits.

## Future Enhancements

### Potential Extensions
- **Real-time updates**: WebSocket-based cache invalidation
- **Persistent cache**: IndexedDB for offline support
- **Cache warming**: Preload customer data on login
- **Analytics**: Track cache hit rates and performance metrics

### Pattern Replication
This cache-until-invalidated pattern can be applied to:
- Product catalog data
- Shopping cart state
- User preferences
- Application settings

## Support

For questions or issues with the migration:
1. Check cache statistics: `customerCache.getStats()`
2. Verify network requests in DevTools
3. Test cross-tab synchronization
4. Review console for cache-related warnings