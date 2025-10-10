# JSON Data Implementation for Country, Shipping, and Payment Methods

This document outlines how country, shipping, and payment method data is implemented in the frontend application.

## Country Data

Country data is managed using a static JSON file and a service that provides access to the data.

- **`frontend/src/data/countries.json`**: This file contains a static list of all available countries. Each country object includes an `id`, `name`, and `code`.

- **`frontend/src/services/CountryService.ts`**: This service is responsible for loading and providing access to the country data from `countries.json`. It includes methods to:
  - Get all available countries.
  - Find a country by its ID or code.
  - Search for countries by name.

This implementation replaced a previous approach that used a GraphQL query to fetch country data, as indicated in `frontend/src/providers/shop/checkout/checkout.ts`.

## Payment Method Data

Payment method data is fetched dynamically from the backend, although a static JSON file exists.

- **`frontend/src/data/payment-methods.json`**: This file contains a static list of payment methods. **However, this file is not directly used by the application.**

- **`frontend/src/providers/shop/checkout/checkout.ts`**: This file defines the `getEligiblePaymentMethodsQuery` GraphQL query, which is used to fetch eligible payment methods from the backend based on the current order.

- **`frontend/src/components/payment/Payment.tsx`**: This component calls the `getEligiblePaymentMethodsQuery` to retrieve the available payment options and renders them for the user.

## Shipping Method Data

Shipping method data is handled dynamically and fetched from the backend based on the user's order and shipping address. There is no static `shipping-methods.json` file.

- **`frontend/src/providers/shop/checkout/checkout.ts`**: This file defines the `getEligibleShippingMethodsQuery` GraphQL query, which retrieves eligible shipping methods from the backend.

- **`frontend/src/components/shipping-method-selector/ShippingMethodSelector.tsx`**: This component uses the `getEligibleShippingMethodsQuery` to display the available shipping options to the user.

- **`frontend/src/components/auto-shipping-selector/AutoShippingSelector.tsx`**: This component also uses the `getEligibleShippingMethodsQuery` to automatically select a shipping method based on the user's address.