# Additional GraphQL Optimizations (Beyond Local-First Checkout)

## Overview
This document outlines GraphQL optimization opportunities that can be implemented alongside or after the local-first checkout refactor. These optimizations focus on reducing data transfer, improving performance, and minimizing API calls without affecting the core checkout flow.

## 1. Context-Specific GraphQL Fragments

### Problem
The current `CustomOrderDetail` fragment fetches all order data for every operation, even when only a subset is needed.

### Solution
Create specialized fragments for different use cases:

#### A. MinimalOrderFragment (for quantity adjustments)
```graphql
fragment MinimalOrderFragment on Order {
  id
  code
  state
  currencyCode
  totalQuantity
  subTotalWithTax
  totalWithTax
  lines {
    id
    quantity
    linePriceWithTax
    productVariant {
      id
      stockLevel
    }
  }
}
```

#### B. CheckoutOrderFragment (for address/customer operations)
```graphql
fragment CheckoutOrderFragment on Order {
  id
  code
  state
  currencyCode
  couponCodes
  totalQuantity
  subTotalWithTax
  shippingWithTax
  totalWithTax
  discounts {
    description
    amountWithTax
  }
  customer {
    id
    firstName
    lastName
    emailAddress
  }
  shippingAddress {
    fullName
    streetLine1
    streetLine2
    company
    city
    province
    postalCode
    countryCode
    phoneNumber
  }
  billingAddress {
    fullName
    streetLine1
    streetLine2
    company
    city
    province
    postalCode
    countryCode
    phoneNumber
  }
  shippingLines {
    priceWithTax
    shippingMethod {
      id
      name
    }
  }
  lines {
    id
    unitPriceWithTax
    linePriceWithTax
    quantity
    productVariant {
      id
      name
      price
      stockLevel
      customFields {
        salePrice
        preOrderPrice
        shipDate
      }
      options {
        id
        code
        name
        group {
          id
          name
        }
      }
      product {
        id
        name
        slug
      }
    }
  }
}
```

#### C. ConfirmationOrderFragment (for payment/confirmation)
```graphql
fragment ConfirmationOrderFragment on Order {
  # Full order details including payments
  # (Current CustomOrderDetail fragment)
}
```

### Implementation
Update mutations to use appropriate fragments:

```typescript
// Before: Always using CustomOrderDetail
mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
  addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
    ...CustomOrderDetail
    ... on ErrorResult {
      errorCode
      message
    }
  }
}

// After: Use MinimalOrderFragment for simple operations
mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
  addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
    ...MinimalOrderFragment
    ... on ErrorResult {
      errorCode
      message
    }
  }
}
```

### Expected Impact
- **Data Transfer Reduction**: 30-50% smaller payloads
- **Network Performance**: Faster response times
- **Client-Side Processing**: Reduced JSON parsing time

## 2. Query Consolidation for Checkout Page

### Problem
Multiple separate queries for checkout data:
- `eligiblePaymentMethods`
- `availableCountries` 
- `eligibleShippingMethods`

### Solution
Combine into a single query:

```graphql
query CheckoutData {
  eligiblePaymentMethods {
    id
    code
    name
    description
    eligibilityMessage
    isEligible
  }
  availableCountries {
    id
    name
    code
  }
  eligibleShippingMethods {
    id
    name
    description
    metadata
    price
    priceWithTax
  }
}
```

### Implementation
Create a unified checkout data loader:

```typescript
// providers/shop/checkout/checkout.ts
export const getCheckoutDataQuery = async () => {
  return shopSdk.checkoutData().then(res => ({
    paymentMethods: res.eligiblePaymentMethods,
    countries: res.availableCountries,
    shippingMethods: res.eligibleShippingMethods
  }));
};
```

### Expected Impact
- **API Calls Reduction**: 66% fewer calls (3 → 1)
- **Improved Performance**: Single network request vs multiple
- **Simplified State Management**: One loading state vs three

## 3. Extended Cache Durations for Static Data

### Problem
Current 2-minute cache durations for relatively static data.

### Solution
Implement appropriate cache durations based on data volatility:

#### A. Highly Static Data (cache for 1 day)
- `availableCountries` - Countries rarely change
- `eligiblePaymentMethods` - Payment methods change infrequently

#### B. Moderately Static Data (cache for 1 hour)
- `eligibleShippingMethods` - May change based on business rules but not frequently

#### C. Dynamic Data (keep current cache)
- Order data - Must be fresh
- Stock levels - Critical to be accurate

### Implementation
Update cache configuration:

```typescript
// In cache utilities
const CACHE_DURATIONS = {
  COUNTRIES: 24 * 60 * 60 * 1000, // 24 hours
  PAYMENT_METHODS: 60 * 60 * 1000, // 1 hour
  SHIPPING_METHODS: 30 * 60 * 1000, // 30 minutes
  ORDER_DATA: 2 * 60 * 1000, // 2 minutes (current)
};

export const getCachedData = <T>(key: string, fetcher: () => Promise<T>, duration: number): Promise<T> => {
  const cached = localStorage.getItem(key);
  const timestamp = localStorage.getItem(`${key}_timestamp`);
  
  if (cached && timestamp) {
    const age = Date.now() - parseInt(timestamp);
    if (age < duration) {
      return Promise.resolve(JSON.parse(cached));
    }
  }
  
  return fetcher().then(data => {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
    return data;
  });
};
```

### Expected Impact
- **API Calls Reduction**: 80% fewer calls for country/payment data
- **Improved User Experience**: Faster page loads with cached data
- **Reduced Server Load**: Fewer requests for static data

## 4. Lazy Loading of Non-Critical Data

### Problem
All checkout data is loaded immediately, even data only needed in specific scenarios.

### Solution
Implement lazy loading patterns for optional/conditional data:

#### A. Customer Data (only needed during checkout)
```typescript
// Load customer data only when entering checkout flow
const customerData = useResource$(async ({ track }) => {
  track(() => isCheckoutActive.value);
  if (isCheckoutActive.value) {
    return await getCustomerQuery();
  }
  return null;
});
```

#### B. Payment Methods (only needed at payment step)
```typescript
// Load payment methods only when user reaches payment step
const paymentMethods = useResource$(async ({ track }) => {
  track(() => checkoutStep.value === 'payment');
  if (checkoutStep.value === 'payment') {
    return await getEligiblePaymentMethodsQuery();
  }
  return [];
});
```

#### C. Tax Details (only if showing breakdown)
```typescript
// Load tax details only when user expands tax breakdown
const taxDetails = useResource$(async ({ track }) => {
  track(() => showTaxBreakdown.value);
  if (showTaxBreakdown.value) {
    return await getOrderTaxDetails();
  }
  return null;
});
```

### Implementation
Update component logic to load data on demand:

```typescript
// In checkout components
export default component$(() => {
  const appState = useContext(APP_STATE);
  const isCheckoutActive = useSignal(false);
  const currentStep = useSignal('cart'); // cart, address, payment, confirm
  
  // Lazy load customer data only when needed
  const customerResource = useResource$(async ({ track }) => {
    const isActive = track(() => isCheckoutActive.value);
    const step = track(() => currentStep.value);
    
    if (isActive && step !== 'cart') {
      return await getActiveCustomerQuery();
    }
    return null;
  });
  
  return (
    <div>
      {/* Render based on current step and loaded data */}
    </div>
  );
});
```

### Expected Impact
- **Faster Initial Page Loads**: 200-500ms improvement
- **Reduced Initial API Calls**: 2-3 fewer calls on initial page load
- **Better Perceived Performance**: Immediate UI with progressive enhancement

## 5. Stock Refresh Optimization

### Problem
Stock refresh may be fetching more data than necessary.

### Solution
Optimize stock refresh to fetch only required variant data:

```typescript
// Instead of full product data, fetch only stock levels
const refreshStockLevels = $(async (variantIds: string[]) => {
  // Optimized query that only fetches stock levels
  return await getVariantStockLevels({ variantIds });
});

// GraphQL query
query VariantStockLevels($variantIds: [ID!]!) {
  variants(ids: $variantIds) {
    id
    stockLevel
    customFields {
      salePrice
      preOrderPrice
      shipDate
    }
  }
}
```

### Implementation
Create specialized stock refresh function:

```typescript
// services/StockRefreshService.ts
export const refreshCriticalStockData = $(async (variantIds: string[]) => {
  if (variantIds.length === 0) return;
  
  try {
    const stockData = await shopSdk.variantStockLevels({ variantIds });
    // Update local cache with fresh stock data
    updateLocalStockCache(stockData.variants);
  } catch (error) {
    console.warn('Failed to refresh stock data:', error);
  }
});
```

### Expected Impact
- **Reduced Data Transfer**: 60-80% smaller payloads for stock refresh
- **Faster Refresh Operations**: Quicker updates to UI
- **Improved User Experience**: More responsive stock level updates

## Expected Overall Impact

### Performance Metrics
- **API Calls Reduction**: 40-60% fewer GraphQL calls
- **Data Transfer Reduction**: 30-50% less data transferred
- **Page Load Time Improvement**: 200-800ms faster loads
- **Server Load Reduction**: 30-50% less backend processing

### User Experience Benefits
- Faster cart interactions
- More responsive UI updates
- Reduced loading states
- Better mobile performance

### Implementation Priority

#### High Priority (1-2 days)
1. Context-specific fragments
2. Query consolidation
3. Extended cache durations

#### Medium Priority (2-3 days)
4. Lazy loading implementation
5. Stock refresh optimization

#### Low Priority (Ongoing)
6. Monitoring and fine-tuning
7. Additional micro-optimizations

## Implementation Checklist

- [ ] Create `MinimalOrderFragment`, `CheckoutOrderFragment`, `ConfirmationOrderFragment`
- [ ] Update all mutations to use appropriate fragments
- [ ] Implement consolidated `CheckoutData` query
- [ ] Extend cache durations for static data
- [ ] Implement lazy loading for customer/payment/tax data
- [ ] Optimize stock refresh queries
- [ ] Test all changes thoroughly
- [ ] Monitor performance improvements
- [ ] Document new patterns for team

## Conclusion

These optimizations complement the local-first checkout refactor by further reducing GraphQL usage and improving overall performance. When combined with the local-first approach, they create a highly performant shopping experience with minimal server dependencies until actual order placement.