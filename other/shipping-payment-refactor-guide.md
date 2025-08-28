# Refactoring Shipping and Payment Methods to Use JSON Files

## 1. Objective

This guide outlines the steps to refactor the shipping and payment method logic to use local JSON files as the single source of truth. This change will improve performance by reducing reliance on GraphQL queries for static data, enhance maintainability by centralizing data, and align the implementation with how country data is currently handled.

## 2. Shipping Method Refactoring

### 2.1. Create `shipping-methods.json`

Create a new file at `/home/vendure/damneddesigns/frontend/src/data/shipping-methods.json` with the following content:

```json
[
  {
    "id": "1",
    "name": "USPS First Class",
    "description": "USPS First Class",
    "price": 8,
    "tax": 0,
    "countryCode": ["US", "PR"],
    "subtotal": {
      "min": 0,
      "max": 99.99
    }
  },
  {
    "id": "2",
    "name": "Free Shipping",
    "description": "Free Shipping",
    "price": 0,
    "tax": 0,
    "countryCode": ["US", "PR"],
    "subtotal": {
      "min": 100,
      "max": 999999
    }
  },
  {
    "id": "3",
    "name": "USPS First Class International",
    "description": "USPS First Class International",
    "price": 20,
    "tax": 0,
    "countryCode": ["*"],
    "subtotal": {
      "min": 0,
      "max": 999999
    }
  }
]
```

### 2.2. Create `ShippingService.ts`

Create a new file at `/home/vendure/damneddesigns/frontend/src/services/ShippingService.ts` to handle the logic for retrieving shipping methods:

```typescript
import shippingMethods from '../data/shipping-methods.json';

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  price: number;
  tax: number;
  countryCode: string[];
  subtotal: {
    min: number;
    max: number;
  };
}

export class ShippingService {
  static getEligibleShippingMethods(countryCode: string, subtotal: number): ShippingMethod[] {
    const methods = shippingMethods.filter(method => {
      const countryMatch = method.countryCode.includes(countryCode) || method.countryCode.includes('*');
      const subtotalMatch = subtotal >= method.subtotal.min && subtotal <= method.subtotal.max;
      return countryMatch && subtotalMatch;
    });
    return methods;
  }
}
```

### 2.3. Refactor `Cart.tsx`

Update `/home/vendure/damneddesigns/frontend/src/components/cart/Cart.tsx` to use the new `ShippingService`.

Replace the existing `calculateShipping` function and the hardcoded `SHIPPING_METHODS` with a call to `ShippingService.getEligibleShippingMethods`.

**Old Code to Remove:**

The `calculateShipping` function and the `SHIPPING_METHODS` constant.

**New Code to Add:**

```typescript
import { ShippingService } from '../../services/ShippingService';

// ... inside the component

const shippingMethods = ShippingService.getEligibleShippingMethods(
  countryCode,
  orderTotalAfterDiscount
);

// Update the rest of the component to use the new shippingMethods array.
```

## 3. Payment Method Refactoring

### 3.1. Create `PaymentService.ts`

Create a new file at `/home/vendure/damneddesigns/frontend/src/services/PaymentService.ts` to load payment methods from `/home/vendure/damneddesigns/frontend/src/data/payment-methods.json`:

```typescript
import paymentMethods from '../data/payment-methods.json';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  logo: string;
}

export class PaymentService {
  static getPaymentMethods(): PaymentMethod[] {
    return paymentMethods;
  }
}
```

### 3.2. Refactor Payment Components

Update the components that currently fetch payment methods via GraphQL to use `PaymentService.getPaymentMethods()`. This will likely include `/home/vendure/damneddesigns/frontend/src/components/checkout/Payment.tsx`.

**Example in `Payment.tsx`:**

```typescript
import { PaymentService } from '../../services/PaymentService';

// ... inside the component

const paymentMethods = PaymentService.getPaymentMethods();

// Update the rest of the component to use the new paymentMethods array.
```

## 4. Cleanup

### 4.1. Remove Unused GraphQL Queries

After refactoring the components, remove the `getEligibleShippingMethodsQuery` and `getEligiblePaymentMethodsQuery` from `/home/vendure/damneddesigns/frontend/src/providers/shop/checkout/checkout.ts`.

## 5. Verification

After implementing these changes, thoroughly test the cart and checkout process to ensure that:
1.  Correct shipping methods and prices are displayed for different countries and order totals.
2.  Payment methods are displayed correctly.
3.  The entire checkout flow can be completed successfully.