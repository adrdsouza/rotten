# GraphQL Analysis Report

This report analyzes the GraphQL calls made on the storefront to identify optimization opportunities.

## 1. GraphQL Queries and Mutations

This section lists all the GraphQL queries and mutations found in the codebase.

### Queries

| Query Name | File Path | Full Field Selection | Timestamp/Trigger Point |
|---|---|---|---|
| `eligiblePaymentMethods` | `/home/vendure/damneddesigns/frontend/src/providers/shop/checkout/eligiblePaymentMethods.graphql` | `id`, `code`, `name`, `description`, `eligibilityMessage`, `isEligible` | Called from `getEligiblePaymentMethodsQuery` and `getEligiblePaymentMethodsCached` in `checkout.ts`. Triggered when the checkout page is loaded or refreshed. |
| `availableCountries` | `/home/vendure/damneddesigns/frontend/src/providers/shop/checkout/checkout.ts` | `id`, `name`, `code` | Called from `getAvailableCountriesQuery` and `getAvailableCountriesCached` in `checkout.ts`. Triggered when the checkout page is loaded or refreshed. |
| `eligibleShippingMethods` | `/home/vendure/damneddesigns/frontend/src/providers/shop/checkout/checkout.ts` | `id`, `name`, `description`, `metadata`, `price`, `priceWithTax` | Called from `getEligibleShippingMethodsQuery` and `getEligibleShippingMethodsCached` in `checkout.ts`. Triggered when the checkout page is loaded or refreshed. |

## 3. Optimization Analysis

This section identifies potential areas for optimizing the GraphQL calls.

### Duplicate Queries

The following queries appear to be duplicated, with both cached and non-cached versions being called from the same file. Consolidating these into a single cached call would reduce complexity and improve performance.

- `getEligibleShippingMethodsQuery` and `getEligibleShippingMethodsCached` in `checkout.ts`
- `getEligiblePaymentMethodsQuery` and `getEligiblePaymentMethodsCached` in `checkout.ts`
- `getAvailableCountriesQuery` and `getAvailableCountriesCached` in `checkout.ts`

### Unused/Rarely Used Fields

Without runtime analysis of the storefront UI, it is difficult to definitively identify unused fields. However, the following fields are candidates for investigation:

- In `eligibleShippingMethods`, the `metadata` field may not be used by the frontend.
- In `transitionOrderToState` and `addPaymentToOrder`, the full `CustomOrderDetail` fragment is returned. It is possible that only a subset of these fields are actually used by the UI after these mutations.

## 4. Rate Limit Impact Assessment

This section analyzes the current call frequency and identifies opportunities for reducing the number of calls.

### Current Call Frequency

| Query/Mutation Name | Call Frequency | Trigger Point | Caching Status |
|---|---|---|---|
| `eligiblePaymentMethods` | High | Every checkout page load | 2-minute cache |
| `availableCountries` | High | Every checkout page load | 2-minute cache |
| `eligibleShippingMethods` | High | Every checkout page load | 2-minute cache |
| `transitionOrderToState` | Low | Only during payment | No cache |
| `addPaymentToOrder` | Low | Only during payment | No cache |

### Projected Reduction Opportunities

1. **Checkout Page Queries**
   - Current: Three separate queries on page load
   - Opportunity: Combine into a single query
   - Potential Reduction: 66% fewer API calls

2. **Caching Strategy**
   - Current: 2-minute cache duration
   - Opportunity: Extend cache duration for static data like `availableCountries`
   - Potential Reduction: 80% fewer calls for country data

### Priority Ranking for Optimization

1. **High Priority**
   - Combine checkout page queries (eligiblePaymentMethods, availableCountries, eligibleShippingMethods)
   - Extend cache duration for static data
   - Review and optimize CustomOrderDetail fragment

2. **Medium Priority**
   - Implement proper error handling and retry logic
   - Add loading states to prevent unnecessary refetching

3. **Low Priority**
   - Review and potentially remove unused fields
   - Optimize error result types

## 5. Recommendations Summary

1. **Immediate Actions**
   - Combine the three checkout queries into a single query
   - Extend cache duration for static data
   - Review the CustomOrderDetail fragment for unused fields

2. **Technical Improvements**
   - Implement proper loading states
   - Add retry logic for failed queries
   - Implement proper error boundaries

3. **Monitoring**
   - Add performance monitoring for GraphQL queries
   - Track cache hit rates
   - Monitor actual field usage in production

## 6. Implementation Plan

1. **Phase 1: Query Optimization**
   - Combine checkout queries
   - Optimize fragments
   - Implement proper caching

2. **Phase 2: Technical Debt**
   - Add proper error handling
   - Implement loading states
   - Add retry logic

3. **Phase 3: Monitoring**
   - Add performance tracking
   - Implement usage analytics
   - Set up alerting for performance issues

## 7. Conclusion

The current GraphQL implementation in the storefront is functional but has room for optimization. The main areas for improvement are:

1. Reducing the number of separate queries during checkout
2. Optimizing cache durations for static data
3. Reviewing and potentially reducing the fields being requested

Implementing these changes could significantly reduce the number of API calls while maintaining all existing functionality.