 [CustomerProvider] Fetching active customer data
 [CustomerProvider] Active customer response: Object
 🔄 Loading stock levels only on page load...
 🚀 Loading stock levels only for initial page load...
 ✅ Stock levels loaded in 751ms - payload ~95% smaller than full products
 ✅ Stock levels loaded on page load - buttons ready
 🔄 Loading full product data for long sleeve...
 🚀 Query batching: Loading 1 products in single request
 ✅ Batched query completed in 341ms for products: longsleeveshirt
 Product loaded and cached with batched query for longsleeveshirt: true
 ✅ Full product data loaded for long sleeve
 Product selected, lazy loading assets...
 Lazy loading assets for: longsleeveshirt
 Assets loaded and cached for longsleeveshirt: 1 assets
 Product selected, lazy loading assets...
 Lazy loading assets for: longsleeveshirt
 Asset cache hit for longsleeveshirt
 🚀 Refreshing stock for 1 unique products using lightweight stock queries
 🚀 Loading stock levels only for product: longsleeveshirt
 ✅ Stock levels loaded for longsleeveshirt in 327ms - payload ~98% smaller than full product
 ✅ Stock refreshed for 1/1 cart items using lightweight queries
q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
 🚢 [CartTotals] [19:25:47.419] Shipping computation triggered for country: TH (trigger: 0)
 🚢 [CartTotals] [19:25:47.419] Calculating shipping for country: TH, orderTotal: 8000
 🚢 [CartTotals] [19:25:47.419] International shipping: 2000 ($20)
 <link rel=modulepreload> has no `href` value
ko @ qwikloader-CAr45hJY.js:1
 [CheckoutValidation] Recalculated: Object
 🚢 [CartTotals] [19:25:47.440] Country change detected: TH, forcing shipping recalculation
 🚢 [CartTotals] [19:25:47.440] Shipping computation triggered for country: TH (trigger: 1)
 🚢 [CartTotals] [19:25:47.440] Calculating shipping for country: TH, orderTotal: 8000
 🚢 [CartTotals] [19:25:47.440] International shipping: 2000 ($20)
 📍 [CheckoutAddresses] Country changed to: TH, Phone optional: false
 📍 [AddressForm] Country changed to: TH, re-validating address fields
 [Payment] Local cart mode - showing Stripe payment directly
 [Payment] Set payment methods: Array(1)
 [CheckoutValidation] Recalculated: Object
 [StripePayment] Generated cart UUID: cc94f53a-7c50-4b43-823e-fa1d452cb32b
 [StripePayment] Setting up window functions...
 [StripePayment] Window functions set up successfully
 [StripePayment] confirmStripePreOrderPayment available: function
 [StripePayment] retryStripePayment available: function
 [StripePayment] Initializing payment form...
 [StripePayment] Loading Stripe with key: pk_test_51RpFqg5TAqA4yxs40EoiNwYYf4CH5vU4u9gyq5CFDqlrVHs6bGjunftEqeAFniNpQGobsYnlZI4WgPvXGZJMhqT200LVztSf63
 [StripePayment] Creating PaymentIntent for estimated total...
 [StripePayment] Payment calculation: Object
 Stripe initialized successfully
 Stripe initialized successfully
 Creating PaymentIntent for 10000 usd, cartUuid: cc94f53a-7c50-4b43-823e-fa1d452cb32b
q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
 PaymentIntent created: pi_3SFK2Z5TAqA4yxs41NMQY7Ds
 [StripePayment] PaymentIntent created: Object
 Creating cart mapping for cart cc94f53a-7c50-4b43-823e-fa1d452cb32b
shop-api:1  Failed to load resource: the server responded with a status of 400 ()
 GraphQL Request Failed: HTTP 400 - Body: {"errors":[{"message":"Field \"createCartMapping\" argument \"orderId\" of type \"String!\" is required, but it was not provided.","locations":[{"line":3,"column":11}],"extensions":{"http":{"status":400,"headers":{}},"code":"GRAPHQL_VALIDATION_FAILED"}},{"message":"Field \"createCartMapping\" argument \"orderCode\" of type \"String!\" is required, but it was not provided.","locations":[{"line":3,"column":11}],"extensions":{"http":{"status":400,"headers":{}},"code":"GRAPHQL_VALIDATION_FAILED"}}]}

makeGraphQLRequest @ StripePayment.tsx_St…TVXlk-CqNlfYhp.js:1
 Failed to create cart mapping: 
createCartMapping @ StripePayment.tsx_St…TVXlk-CqNlfYhp.js:1
 Cart mapping created successfully
 Updating cart mapping cc94f53a-7c50-4b43-823e-fa1d452cb32b with payment intent pi_3SFK2Z5TAqA4yxs41NMQY7Ds
 Cart mapping updated successfully: null
 [StripePayment] Cart mapping updated with PaymentIntent ID
 [Stripe.js] The following payment method types are not activated:

- wechat_pay

They will be displayed in test mode, but hidden in live mode. Please activate the payment method types in your dashboard (https://dashboard.stripe.com/settings/payment_methods) and ensure your account is enabled for any preview features that you are trying to use.
warn @ controller-with-prec…545e669ee64852.js:1
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
 🚢 [CartTotals] [19:26:06.098] Shipping computation triggered for country: TH (trigger: 1)
 🚢 [CartTotals] [19:26:06.098] Calculating shipping for country: TH, orderTotal: 8000
 🚢 [CartTotals] [19:26:06.098] International shipping: 2000 ($20)
 🚢 [CartTotals] [19:26:06.099] Country change detected: TH, forcing shipping recalculation
 🚢 [CartTotals] [19:26:06.099] Shipping computation triggered for country: TH (trigger: 2)
 🚢 [CartTotals] [19:26:06.099] Calculating shipping for country: TH, orderTotal: 8000
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.099] International shipping: 2000 ($20)
CheckoutValidationContext.tsx_CheckoutValidationProvider_component_useVisibleTask_fB7tRikw2S8-35n5dbjS.js:1 [CheckoutValidation] Recalculated: Object
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📍 [CheckoutAddresses] Country changed to: TH, Phone optional: false
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📞 [CheckoutAddresses] Phone re-validated for TH: valid
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 📍 [AddressForm] Country changed to: TH, re-validating address fields
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 📮 [AddressForm] Postal code re-validated for TH
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 🏛️ [AddressForm] Province re-validated for TH
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 Uncaught ReferenceError: validateAndSync$ is not defined
    at AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1:9254
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.965] Shipping computation triggered for country: TH (trigger: 2)
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.965] Calculating shipping for country: TH, orderTotal: 8000
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.965] International shipping: 2000 ($20)
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.966] Country change detected: TH, forcing shipping recalculation
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.966] Shipping computation triggered for country: TH (trigger: 3)
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.966] Calculating shipping for country: TH, orderTotal: 8000
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:1159 🚢 [CartTotals] [19:26:06.966] International shipping: 2000 ($20)
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📍 [CheckoutAddresses] Country changed to: TH, Phone optional: false
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📞 [CheckoutAddresses] Phone re-validated for TH: valid
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 📍 [AddressForm] Country changed to: TH, re-validating address fields
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 📮 [AddressForm] Postal code re-validated for TH
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-BWodsUZ2.js:1 🏛️ [AddressForm] Province re-validated for TH
CheckoutValidationContext.tsx_CheckoutValidationProvider_component_useVisibleTask_fB7tRikw2S8-35n5dbjS.js:1 [CheckoutValidation] Recalculated: Object
shop/q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 🚀 Using optimized parallel processing for address and shipping setup...
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 ✅ Parallel address and shipping setup completed successfully
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📦 Shipping method automatically applied
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds for order RH000128
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds amount to 10000
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Stripe initialized successfully
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] PaymentIntent amount updated
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds metadata for order RH000128 (377)
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 PaymentIntent metadata updated successfully for order RH000128
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] PaymentIntent metadata updated with order details
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Attempting to transition order to state: ArrangingPayment
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Raw GraphQL result: {
  "transitionOrderToState": {
    "__typename": "Order",
    "id": "377",
    "code": "RH000128",
    "active": true,
    "createdAt": "2025-10-06T19:26:23.390Z",
    "state": "ArrangingPayment",
    "currencyCode": "USD",
    "couponCodes": [],
    "discounts": [],
    "totalQuantity": 1,
    "subTotal": 8000,
    "subTotalWithTax": 8000,
    "taxSummary": [
      {
        "description": "No configured tax rate",
        "taxRate": 0,
        "taxTotal": 0
      },
      {
        "description": "shipping tax",
        "taxRate": 0,
        "taxTotal": 0
      }
    ],
    "shippingWithTax": 2000,
    "totalWithTax": 10000,
    "customer": {
      "id": "1",
      "firstName": "adrian",
      "lastName": "dsouza",
      "emailAddress": "adrdsouza@gmail.com"
    },
    "shippingAddress": {
      "fullName": "adrian dsouza",
      "streetLine1": "23423",
      "streetLine2": "",
      "company": "",
      "city": "asdasd",
      "province": "asdasd",
      "postalCode": "3234",
      "countryCode": "TH",
      "phoneNumber": "935426212"
    },
    "billingAddress": {
      "fullName": null,
      "streetLine1": null,
      "streetLine2": null,
      "company": null,
      "city": null,
      "province": null,
      "postalCode": null,
      "countryCode": null,
      "phoneNumber": null
    },
    "shippingLines": [
      {
        "shippingMethod": {
          "id": "7",
          "name": "USPS First class int"
        },
        "priceWithTax": 2000
      }
    ],
    "lines": [
      {
        "id": "21323",
        "unitPriceWithTax": 8000,
        "linePriceWithTax": 8000,
        "quantity": 1,
        "featuredAsset": {
          "id": "30",
          "preview": "https://rottenhand.com/assets/preview/73/ls__preview.jpg"
        },
        "productVariant": {
          "id": "61",
          "name": "Small - Hot pink",
          "price": 8000,
          "stockLevel": "9007199254740991",
          "options": [
            {
              "id": "106",
              "code": "small",
              "name": "Small",
              "group": {
                "id": "26",
                "name": "Size"
              }
            },
            {
              "id": "115",
              "code": "hot-pink",
              "name": "Hot pink",
              "group": {
                "id": "27",
                "name": "Color"
              }
            }
          ],
          "product": {
            "id": "3",
            "name": "Core long sleeve shirt",
            "slug": "longsleeveshirt"
          }
        }
      }
    ],
    "payments": []
  }
}
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 ✅ Order state transition successful. New state: ArrangingPayment
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Stripe trigger signal received: 1
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Triggering Stripe payment for order: RH000128
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Starting payment confirmation with order: Object
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Submitting payment form...
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Form submitted successfully, confirming payment with Stripe...
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFK2Z5TAqA4yxs41NMQY7Ds/confirm:1  Failed to load resource: the server responded with a status of 402 ()
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Payment confirmation failed: Object
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: Object
handlePaymentError @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: Object
handlePaymentError @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Stripe payment failed: Your card was declined. Please try a different card or payment method.
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Stripe initialized successfully
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Payment failed, restoring cart state for retry...
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Cart data preserved for retry: 1 items
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Attempting to transition order to state: AddingItems
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Raw GraphQL result: {
  "transitionOrderToState": {
    "__typename": "Order",
    "id": "377",
    "code": "RH000128",
    "active": true,
    "createdAt": "2025-10-06T19:26:23.390Z",
    "state": "AddingItems",
    "currencyCode": "USD",
    "couponCodes": [],
    "discounts": [],
    "totalQuantity": 1,
    "subTotal": 8000,
    "subTotalWithTax": 8000,
    "taxSummary": [
      {
        "description": "No configured tax rate",
        "taxRate": 0,
        "taxTotal": 0
      },
      {
        "description": "shipping tax",
        "taxRate": 0,
        "taxTotal": 0
      }
    ],
    "shippingWithTax": 2000,
    "totalWithTax": 10000,
    "customer": {
      "id": "1",
      "firstName": "adrian",
      "lastName": "dsouza",
      "emailAddress": "adrdsouza@gmail.com"
    },
    "shippingAddress": {
      "fullName": "adrian dsouza",
      "streetLine1": "23423",
      "streetLine2": "",
      "company": "",
      "city": "asdasd",
      "province": "asdasd",
      "postalCode": "3234",
      "countryCode": "TH",
      "phoneNumber": "935426212"
    },
    "billingAddress": {
      "fullName": null,
      "streetLine1": null,
      "streetLine2": null,
      "company": null,
      "city": null,
      "province": null,
      "postalCode": null,
      "countryCode": null,
      "phoneNumber": null
    },
    "shippingLines": [
      {
        "shippingMethod": {
          "id": "7",
          "name": "USPS First class int"
        },
        "priceWithTax": 2000
      }
    ],
    "lines": [
      {
        "id": "21323",
        "unitPriceWithTax": 8000,
        "linePriceWithTax": 8000,
        "quantity": 1,
        "featuredAsset": {
          "id": "30",
          "preview": "https://rottenhand.com/assets/preview/73/ls__preview.jpg"
        },
        "productVariant": {
          "id": "61",
          "name": "Small - Hot pink",
          "price": 8000,
          "stockLevel": "9007199254740991",
          "options": [
            {
              "id": "106",
              "code": "small",
              "name": "Small",
              "group": {
                "id": "26",
                "name": "Size"
              }
            },
            {
              "id": "115",
              "code": "hot-pink",
              "name": "Hot pink",
              "group": {
                "id": "27",
                "name": "Color"
              }
            }
          ],
          "product": {
            "id": "3",
            "name": "Core long sleeve shirt",
            "slug": "longsleeveshirt"
          }
        }
      }
    ],
    "payments": []
  }
}
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 ✅ Order state transition successful. New state: AddingItems
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Order transitioned back to AddingItems state for retry
shop/q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:687 [conversion_1759778803251_gosb0910p] Found existing order with 1 items. Clearing to prevent accumulation.
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:687 [conversion_1759778803251_gosb0910p] Removed existing order line: 21323
ConditionalCart.tsx_ConditionalCart_component_useVisibleTask_RP4IxP1UhA4-rwDSzDL8.js:687 [conversion_1759778803251_gosb0910p] Order cleared. Remaining lines: 0
q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 🚀 Using optimized parallel processing for address and shipping setup...
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 ✅ Parallel address and shipping setup completed successfully
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-B7lNZI7z.js:258 📦 Shipping method automatically applied
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds for order RH000128
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds amount to 10000
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Stripe initialized successfully
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] PaymentIntent amount updated
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Updating PaymentIntent pi_3SFK2Z5TAqA4yxs41NMQY7Ds metadata for order RH000128 (377)
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 PaymentIntent metadata updated successfully for order RH000128
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] PaymentIntent metadata updated with order details
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Attempting to transition order to state: ArrangingPayment
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Raw GraphQL result: {
  "transitionOrderToState": {
    "__typename": "Order",
    "id": "377",
    "code": "RH000128",
    "active": true,
    "createdAt": "2025-10-06T19:26:23.390Z",
    "state": "ArrangingPayment",
    "currencyCode": "USD",
    "couponCodes": [],
    "discounts": [],
    "totalQuantity": 1,
    "subTotal": 8000,
    "subTotalWithTax": 8000,
    "taxSummary": [
      {
        "description": "No configured tax rate",
        "taxRate": 0,
        "taxTotal": 0
      },
      {
        "description": "shipping tax",
        "taxRate": 0,
        "taxTotal": 0
      }
    ],
    "shippingWithTax": 2000,
    "totalWithTax": 10000,
    "customer": {
      "id": "1",
      "firstName": "adrian",
      "lastName": "dsouza",
      "emailAddress": "adrdsouza@gmail.com"
    },
    "shippingAddress": {
      "fullName": "adrian dsouza",
      "streetLine1": "23423",
      "streetLine2": "",
      "company": "",
      "city": "asdasd",
      "province": "asdasd",
      "postalCode": "3234",
      "countryCode": "TH",
      "phoneNumber": "935426212"
    },
    "billingAddress": {
      "fullName": null,
      "streetLine1": null,
      "streetLine2": null,
      "company": null,
      "city": null,
      "province": null,
      "postalCode": null,
      "countryCode": null,
      "phoneNumber": null
    },
    "shippingLines": [
      {
        "shippingMethod": {
          "id": "7",
          "name": "USPS First class int"
        },
        "priceWithTax": 2000
      }
    ],
    "lines": [
      {
        "id": "21324",
        "unitPriceWithTax": 8000,
        "linePriceWithTax": 8000,
        "quantity": 1,
        "featuredAsset": {
          "id": "30",
          "preview": "https://rottenhand.com/assets/preview/73/ls__preview.jpg"
        },
        "productVariant": {
          "id": "61",
          "name": "Small - Hot pink",
          "price": 8000,
          "stockLevel": "9007199254740991",
          "options": [
            {
              "id": "106",
              "code": "small",
              "name": "Small",
              "group": {
                "id": "26",
                "name": "Size"
              }
            },
            {
              "id": "115",
              "code": "hot-pink",
              "name": "Hot pink",
              "group": {
                "id": "27",
                "name": "Color"
              }
            }
          ],
          "product": {
            "id": "3",
            "name": "Core long sleeve shirt",
            "slug": "longsleeveshirt"
          }
        }
      }
    ],
    "payments": []
  }
}
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 ✅ Order state transition successful. New state: ArrangingPayment
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Stripe trigger signal received: 1
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Triggering Stripe payment for order: RH000128
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Starting payment confirmation with order: {__typename: 'Order', id: '377', code: 'RH000128', active: true, createdAt: '2025-10-06T19:26:23.390Z', …}
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Submitting payment form...
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Form submission failed: {code: 'incomplete_number', type: 'validation_error', message: 'Your card number is incomplete.', extra_fields: {…}}
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Error type: validation_error
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Error code: incomplete_number
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [StripePayment] Error message: Your card number is incomplete.
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: {code: 'incomplete_number', type: 'validation_error', message: 'Your card number is incomplete.', extra_fields: {…}}
handlePaymentError @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
getErrorMessage @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: {code: 'incomplete_number', type: 'validation_error', message: 'Your card number is incomplete.', extra_fields: {…}}
handlePaymentError @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
isErrorRetryable @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1
await in window.confirmStripePreOrderPayment
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1 [Payment] Stripe payment failed: Please check your payment information and try again.
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-DqvdQjJT.js:1
await in C
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Payment failed, restoring cart state for retry...
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Cart data preserved for retry: 1 items
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Attempting to transition order to state: AddingItems
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 Stripe initialized successfully
qwikloader-CAr45hJY.js:1  GET https://rottenhand.com/shop/q-data.json 404 (Not Found)
li @ qwikloader-CAr45hJY.js:1
bc @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
s @ qwikloader-CAr45hJY.js:1
a @ qwikloader-CAr45hJY.js:1
Cc @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
s @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Ue @ qwikloader-CAr45hJY.js:1
hr @ qwikloader-CAr45hJY.js:1
s @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
Promise.then
o @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
processChores @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
setTimeout
(anonymous) @ qwikloader-CAr45hJY.js:1
nextTick @ qwikloader-CAr45hJY.js:1
scheduleRender @ qwikloader-CAr45hJY.js:1
(anonymous) @ qwikloader-CAr45hJY.js:1
t @ qwikloader-CAr45hJY.js:1
R @ qwikloader-CAr45hJY.js:1
o @ qwikloader-CAr45hJY.js:1
no @ qwikloader-CAr45hJY.js:1
f @ qwikloader-CAr45hJY.js:1
set @ qwikloader-CAr45hJY.js:1
Y @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 🔄 Raw GraphQL result: {
  "transitionOrderToState": {
    "__typename": "Order",
    "id": "377",
    "code": "RH000128",
    "active": true,
    "createdAt": "2025-10-06T19:26:23.390Z",
    "state": "AddingItems",
    "currencyCode": "USD",
    "couponCodes": [],
    "discounts": [],
    "totalQuantity": 1,
    "subTotal": 8000,
    "subTotalWithTax": 8000,
    "taxSummary": [
      {
        "description": "No configured tax rate",
        "taxRate": 0,
        "taxTotal": 0
      },
      {
        "description": "shipping tax",
        "taxRate": 0,
        "taxTotal": 0
      }
    ],
    "shippingWithTax": 2000,
    "totalWithTax": 10000,
    "customer": {
      "id": "1",
      "firstName": "adrian",
      "lastName": "dsouza",
      "emailAddress": "adrdsouza@gmail.com"
    },
    "shippingAddress": {
      "fullName": "adrian dsouza",
      "streetLine1": "23423",
      "streetLine2": "",
      "company": "",
      "city": "asdasd",
      "province": "asdasd",
      "postalCode": "3234",
      "countryCode": "TH",
      "phoneNumber": "935426212"
    },
    "billingAddress": {
      "fullName": null,
      "streetLine1": null,
      "streetLine2": null,
      "company": null,
      "city": null,
      "province": null,
      "postalCode": null,
      "countryCode": null,
      "phoneNumber": null
    },
    "shippingLines": [
      {
        "shippingMethod": {
          "id": "7",
          "name": "USPS First class int"
        },
        "priceWithTax": 2000
      }
    ],
    "lines": [
      {
        "id": "21324",
        "unitPriceWithTax": 8000,
        "linePriceWithTax": 8000,
        "quantity": 1,
        "featuredAsset": {
          "id": "30",
          "preview": "https://rottenhand.com/assets/preview/73/ls__preview.jpg"
        },
        "productVariant": {
          "id": "61",
          "name": "Small - Hot pink",
          "price": 8000,
          "stockLevel": "9007199254740991",
          "options": [
            {
              "id": "106",
              "code": "small",
              "name": "Small",
              "group": {
                "id": "26",
                "name": "Size"
              }
            },
            {
              "id": "115",
              "code": "hot-pink",
              "name": "Hot pink",
              "group": {
                "id": "27",
                "name": "Color"
              }
            }
          ],
          "product": {
            "id": "3",
            "name": "Core long sleeve shirt",
            "slug": "longsleeveshirt"
          }
        }
      }
    ],
    "payments": []
  }
}
StripePayment.tsx_StripePayment_component_4lbx0tTVXlk-CqNlfYhp.js:1 ✅ Order state transition successful. New state: AddingItems
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-CAiMfygT.js:1 [Checkout] Order transitioned back to AddingItems state for retry
