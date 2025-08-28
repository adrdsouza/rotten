# JSON-Based Data Implementation for Countries, Shipping, and Payment Methods

**Date:** August 28, 2025
**Created by:** Qwen Code

## Overview

This optimization replaces GraphQL queries for static country, shipping, and payment method data with local JSON files and dedicated services. This change improves performance by reducing backend calls for static data and enhances maintainability by centralizing configuration.

## What Was Implemented

### 1. New Data Files

Created JSON files in `frontend/src/data/` containing static data:

- **countries.json**: Complete list of 248 countries with ID, name, and ISO code
- **shipping-methods.json**: Configurable shipping methods with country restrictions and price rules
- **payment-methods.json**: Available payment methods with enable/disable flags

### 2. New Services

Created TypeScript services in `frontend/src/services/` to manage the data:

- **CountryService.ts**: Provides access to country data with search and lookup functions
- **ShippingService.ts**: Calculates eligible shipping methods based on country and order subtotal
- **PaymentService.ts**: Filters and returns enabled payment methods

### 3. Updated Components

Modified components to use the new services instead of GraphQL queries:

- **ShippingMethodSelector.tsx**: Uses `getEligibleShippingMethodsCached()` with country code and subtotal parameters
- **AutoShippingSelector.tsx**: Uses `getEligibleShippingMethodsCached()` with country code and subtotal parameters
- **Layout.tsx**: Uses `CountryService.getAvailableCountries()` directly in route loader

### 4. Updated Providers

Modified `checkout.ts` provider to delegate to new services:

- **getAvailableCountriesQuery()**: Now calls `CountryService.getAvailableCountries()`
- **getEligibleShippingMethodsQuery()**: Now calls `ShippingService.getEligibleShippingMethods()`
- **getEligiblePaymentMethodsQuery()**: Now calls `PaymentService.getPaymentMethods()`
- **getEligibleShippingMethodsCached()**: Updated to accept country code and subtotal parameters

## What Was Deleted

### 1. GraphQL Queries

Removed all GraphQL queries for static data:

- **availableCountries** query and related fragments
- **eligibleShippingMethods** query and related fragments
- **eligiblePaymentMethods** query and related fragments

### 2. GraphQL Files

Deleted unused GraphQL document files:

- **eligiblePaymentMethods.graphql**: GraphQL query document for payment methods

### 3. Unused Imports

Removed unused imports from various files:
- Removed unused `getAvailableCountriesQuery` import from `layout.tsx`

## Benefits

### Performance Improvements

- Eliminates network requests for static country, shipping, and payment data
- Reduces GraphQL query complexity and payload size
- Faster page loads and checkout experience

### Maintainability

- Centralized configuration in JSON files
- Easier to update shipping rules and payment methods
- No need to modify backend when changing static data

### Code Quality

- Reduced coupling between frontend and backend for static data
- Simplified component logic
- Better separation of concerns with dedicated services

## Implementation Details

### Shipping Method Logic

The new `ShippingService` implements business rules directly in the frontend:

```typescript
// Country matching (supports wildcards)
const countryMatch = method.countryCodes.includes(countryCode) || method.countryCodes.includes('*');

// Subtotal range checking
const maxSubtotalMatch = method.maxSubtotal === undefined || subtotal <= method.maxSubtotal;
const minSubtotalMatch = method.minSubtotal === undefined || subtotal >= method.minSubtotal;
```

### Caching Strategy

Updated the cached shipping methods function to include country code and subtotal in the cache key:

```typescript
const cacheKey = `eligible-shipping-methods-${countryCode}-${subtotal}`;
```

### Local Cart Mode Support

All components properly handle local cart mode where no active order exists:

```typescript
// Skip in local cart mode since we can't calculate shipping without an order
if (localCart.isLocalMode) {
  console.log('🛒 Local cart mode: Skipping shipping methods query');
  return;
}
```

## Testing

The implementation has been verified to:
- Compile without TypeScript errors
- Pass all linting checks
- Maintain the same user experience
- Properly handle local cart mode
- Support all existing country, shipping, and payment method functionality

## Future Considerations

- The JSON files can be easily updated without redeploying the backend
- Additional shipping rules can be added to `shipping-methods.json`
- New payment methods can be added to `payment-methods.json` and enabled/disabled as needed
- Consider implementing a build-time process to generate these JSON files from backend data if synchronization is needed