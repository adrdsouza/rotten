# Cart Page GraphQL Analysis

## Overview
The cart page displays the current shopping cart contents and handles quantity adjustments, item removal, and shipping calculations. It operates in two modes: local cart (client-side storage) and Vendure order (server-side).

## GraphQL Operations

### 1. Active Order Query
- **Operation Type**: Query
- **Operation Name**: `activeOrder`
- **Trigger**: Cart initialization when in Vendure mode
- **Frequency**: Once per cart session when switching to Vendure mode

#### Fields Queried:
```graphql
query activeOrder {
  activeOrder {
    __typename
    id
    code
    active
    createdAt
    state
    currencyCode
    couponCodes
    totalQuantity
    subTotal
    subTotalWithTax
    shippingWithTax
    totalWithTax
    discounts {
      type
      description
      amountWithTax
    }
    taxSummary {
      description
      taxRate
      taxTotal
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
      featuredAsset {
        id
        preview
      }
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
    payments {
      id
      method
      amount
      state
      transactionId
      metadata
    }
  }
}
```

#### Observations:
1. Fetches complete order information including all line items
2. Queries customer information for checkout
3. Gets both shipping and billing addresses
4. Retrieves payment information
5. Includes tax summary and discount information
6. Queries custom fields for variant-specific information

### 2. Add Item to Order Mutation
- **Operation Type**: Mutation
- **Operation Name**: `addItemToOrder`
- **Trigger**: Adding items to cart when in Vendure mode
- **Frequency**: Each time an item is added to the cart

#### Fields Queried:
Same as `activeOrder` query (uses `CustomOrderDetail` fragment)

#### Parameters:
- `productVariantId`: ID of the product variant to add
- `quantity`: Number of items to add

### 3. Remove Order Line Mutation
- **Operation Type**: Mutation
- **Operation Name**: `removeOrderLine`
- **Trigger**: Removing items from cart when in Vendure mode
- **Frequency**: Each time an item is removed from the cart

#### Fields Queried:
Same as `activeOrder` query (uses `CustomOrderDetail` fragment)

#### Parameters:
- `orderLineId`: ID of the order line to remove

### 4. Adjust Order Line Mutation
- **Operation Type**: Mutation
- **Operation Name**: `adjustOrderLine`
- **Trigger**: Changing item quantities when in Vendure mode
- **Frequency**: Each time item quantity is adjusted

#### Fields Queried:
Same as `activeOrder` query (uses `CustomOrderDetail` fragment)

#### Parameters:
- `orderLineId`: ID of the order line to adjust
- `quantity`: New quantity for the item

### 5. Apply Coupon Code Mutation
- **Operation Type**: Mutation
- **Operation Name**: `applyCouponCode`
- **Trigger**: Applying a coupon code in Vendure mode
- **Frequency**: When user applies a coupon code

#### Fields Queried:
Same as `activeOrder` query (uses `CustomOrderDetail` fragment)

#### Parameters:
- `couponCode`: Coupon code to apply

### 6. Remove Coupon Code Mutation
- **Operation Type**: Mutation
- **Operation Name**: `removeCouponCode`
- **Trigger**: Removing a coupon code in Vendure mode
- **Frequency**: When user removes a coupon code

#### Fields Queried:
Same as `activeOrder` query (uses `CustomOrderDetail` fragment)

#### Parameters:
- `couponCode`: Coupon code to remove

## Local Cart Mode Operations
When in local cart mode, the cart uses client-side storage instead of GraphQL operations:

### 1. Local Cart Service Methods
- `addItem`: Adds item to local storage cart
- `updateItemQuantity`: Updates item quantity in local storage cart
- `removeItem`: Removes item from local storage cart
- `getCart`: Retrieves cart from local storage
- `refreshAllStockLevels`: Refreshes stock levels using GraphQL product queries

### 2. Product Queries for Stock Refresh
- **Operation Type**: Query
- **Operation Name**: `product`
- **Trigger**: Stock refresh operations
- **Frequency**: When refreshing stock levels in local cart

#### Fields Queried:
Same as product page query

## Unused/Unreferenced Fields
After thorough analysis, most fields are used in the cart implementation:

**Definitely Used:**
- `id`: For item identification and operations
- `code`: Order identification
- `active`: Order status tracking
- `createdAt`: Order timestamp
- `state`: Order state management
- `currencyCode`: Price formatting
- `couponCodes`: Coupon display and management
- `totalQuantity`: Cart badge and empty state
- `subTotal` and `subTotalWithTax`: Subtotal calculation
- `shippingWithTax`: Shipping cost display
- `totalWithTax`: Total price calculation
- `discounts`: Discount display
- `taxSummary`: Tax information display
- `customer`: Checkout information
- `shippingAddress` and `billingAddress`: Address display
- `shippingLines`: Shipping method display
- `lines`: Cart item display
- `payments`: Payment information display
- `lines[*].unitPriceWithTax`: Item price display
- `lines[*].linePriceWithTax`: Line total calculation
- `lines[*].quantity`: Quantity display and adjustments
- `lines[*].featuredAsset`: Item image display
- `lines[*].productVariant`: Variant information display
- `lines[*].productVariant.customFields`: Sale/pre-order information

**Potentially Unused:**
- `__typename`: GraphQL type information (may be used by client)
- `active`: May be redundant since we're looking at active order
- `createdAt`: Not directly displayed but could be used for analytics
- `taxSummary`: May not be displayed in current UI
- `payments`: May not be relevant in cart view (more for checkout/confirmation)
- `customer`: May not be displayed in cart view

## Performance Considerations
1. The `CustomOrderDetail` fragment is comprehensive and may include more data than needed for simple cart operations
2. Local cart mode reduces server requests but requires periodic synchronization
3. Stock refresh operations could be optimized to fetch only necessary fields
4. The large fragment may impact network performance for users with many cart items

## Recommendations
1. Consider creating a lighter-weight fragment for cart-specific operations that don't need all order details
2. Implement more granular stock refresh that only fetches stock levels rather than complete product data
3. Add better error handling for network failures during cart operations
4. Consider implementing optimistic UI updates for better perceived performance
5. Add loading states for cart operations to improve user experience