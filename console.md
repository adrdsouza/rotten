 [CustomerProvider] Fetching active customer data
 [CustomerProvider] Active customer response: Object
 🔄 Loading stock levels only on page load...
 🚀 Loading stock levels only for initial page load...
 ✅ Stock levels loaded in 585ms - payload ~95% smaller than full products
 ✅ Stock levels loaded on page load - buttons ready
 🔄 Loading full product data for long sleeve...
 🚀 Query batching: Loading 1 products in single request
 ✅ Batched query completed in 398ms for products: longsleeveshirt
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
 ✅ Stock levels loaded for longsleeveshirt in 368ms - payload ~98% smaller than full product
 ✅ Stock refreshed for 1/1 cart items using lightweight queries
shop/q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
 🚢 [CartTotals] [09:11:12.081] Shipping computation triggered for country: TH (trigger: 0)
 🚢 [CartTotals] [09:11:12.081] Calculating shipping for country: TH, orderTotal: 8000
 🚢 [CartTotals] [09:11:12.081] International shipping: 2000 ($20)
 <link rel=modulepreload> has no `href` value
qo @ qwikloader-PM4a8O9R.js:1
 [CheckoutValidation] Recalculated: Object
 🚢 [CartTotals] [09:11:12.099] Country change detected: TH, forcing shipping recalculation
 🚢 [CartTotals] [09:11:12.099] Shipping computation triggered for country: TH (trigger: 1)
 🚢 [CartTotals] [09:11:12.099] Calculating shipping for country: TH, orderTotal: 8000
 🚢 [CartTotals] [09:11:12.099] International shipping: 2000 ($20)
 📍 [CheckoutAddresses] Country changed to: TH, Phone optional: false
 📍 [AddressForm] Country changed to: TH, re-validating address fields
 [Payment] Local cart mode - showing Stripe payment directly
 [Payment] Set payment methods: Array(1)
 [CheckoutValidation] Recalculated: Object
 [StripePayment] Generated cart UUID: e970555f-33ed-4178-9259-19f2d18a6fdf
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
 Creating PaymentIntent for 10000 usd, cartUuid: e970555f-33ed-4178-9259-19f2d18a6fdf
shop/q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
 PaymentIntent created: pi_3SFtOt5TAqA4yxs415gmUc1j
 [StripePayment] PaymentIntent created: Object
 Creating cart mapping for cart e970555f-33ed-4178-9259-19f2d18a6fdf
shop-api:1  Failed to load resource: the server responded with a status of 400 ()
 GraphQL Request Failed: HTTP 400 - Body: {"errors":[{"message":"Field \"createCartMapping\" argument \"orderId\" of type \"String!\" is required, but it was not provided.","locations":[{"line":3,"column":11}],"extensions":{"http":{"status":400,"headers":{}},"code":"GRAPHQL_VALIDATION_FAILED"}},{"message":"Field \"createCartMapping\" argument \"orderCode\" of type \"String!\" is required, but it was not provided.","locations":[{"line":3,"column":11}],"extensions":{"http":{"status":400,"headers":{}},"code":"GRAPHQL_VALIDATION_FAILED"}}]}

makeGraphQLRequest @ StripePayment.tsx_St…IrNko-Ddmbk6WY.js:1
 Failed to create cart mapping: 
createCartMapping @ StripePayment.tsx_St…IrNko-Ddmbk6WY.js:1
 Cart mapping created successfully
 Updating cart mapping e970555f-33ed-4178-9259-19f2d18a6fdf with payment intent pi_3SFtOt5TAqA4yxs415gmUc1j
 Cart mapping updated successfully: null
 [StripePayment] Cart mapping updated with PaymentIntent ID
favicon.ico:1  Failed to load resource: the server responded with a status of 404 ()
 [Stripe.js] The following payment method types are not activated:

- wechat_pay

They will be displayed in test mode, but hidden in live mode. Please activate the payment method types in your dashboard (https://dashboard.stripe.com/settings/payment_methods) and ensure your account is enabled for any preview features that you are trying to use.
warn @ controller-with-prec…a54dc96dae472e.js:1
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
The resource <URL> was preloaded using link preload but not used within a few seconds from the window's load event. Please make sure it has an appropriate `as` value and it is preloaded intentionally.
 [LoginModal] Starting login process
 [LoginModal] Calling login mutation with email: adrdsouza@gmail.com
 [LoginModal] Login mutation response: {
  "__typename": "CurrentUser",
  "id": "15101",
  "identifier": "adrdsouza@gmail.com"
}
 [LoginModal] Login successful, updating app state
 [LoginModal] Fetching active customer data
 [CustomerProvider] Fetching active customer data
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:1 [CustomerProvider] Active customer response: Object
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Customer data received: {
  "id": "1",
  "title": "",
  "firstName": "adrian",
  "lastName": "dsouza",
  "emailAddress": "adrdsouza@gmail.com",
  "phoneNumber": "935523123"
}
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] App state customer updated: Proxy(Object)
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Clearing customer cache
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Syncing addresses from Vendure for customer ID: 1
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Addresses synced: Array(3)
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Default shipping address prefilled: Proxy(Object)
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Closing modal
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Login process completed successfully
LoginModal.tsx_LoginModal_component_div_div_div_div_Fragment_form_onSubmit_c5nPG0hf3AY-CuwXALbD.js:101 [LoginModal] Login process finished
layout.tsx_layout_component_useVisibleTask_2_ztO9vrzwOTE-DdVo0rSZ.js:1 [Layout] Set customer phone from shipping address:  from address: undefined
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.265] Shipping computation triggered for country: US (trigger: 1)
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.265] Calculating shipping for country: US, orderTotal: 8000
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.265] US/PR shipping: 800 ($8 under $100)
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.266] Country change detected: US, forcing shipping recalculation
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.266] Shipping computation triggered for country: US (trigger: 2)
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.266] Calculating shipping for country: US, orderTotal: 8000
CartContents.tsx_CartContents_component_AsVuyEkBZg0-Dsx1UmPI.js:1159 🚢 [CartTotals] [09:11:23.266] US/PR shipping: 800 ($8 under $100)
CheckoutValidationContext.tsx_CheckoutValidationProvider_component_useVisibleTask_fB7tRikw2S8--C13b7yU.js:1 [CheckoutValidation] Recalculated: Object
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:258 📍 [CheckoutAddresses] Country changed to: US, Phone optional: true
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-Dbkvm9fk.js:1 📍 [AddressForm] Country changed to: US, re-validating address fields
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-Dbkvm9fk.js:1 📮 [AddressForm] Postal code re-validated for US
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-Dbkvm9fk.js:1 🏛️ [AddressForm] Province re-validated for US
AddressForm.tsx_AddressForm_component_TWfj88H6RgE-Dbkvm9fk.js:1 Uncaught ReferenceError: validateAndSync$ is not defined
    at AddressForm.tsx_AddressForm_component_TWfj88H6RgE-Dbkvm9fk.js:1:9233
CheckoutValidationContext.tsx_CheckoutValidationProvider_component_useVisibleTask_fB7tRikw2S8--C13b7yU.js:1 [CheckoutValidation] Recalculated: Object
shop/q-data.json:1  Failed to load resource: the server responded with a status of 404 ()
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:258 🚀 Using optimized parallel processing for address and shipping setup...
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:258 ✅ Parallel address and shipping setup completed successfully
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:258 📦 Shipping method automatically applied
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:1 4be789e4dec5a0863f3006f8588ea1cb607334c31c4797a055863851e0ba738c
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:1 undefined
CheckoutAddresses.tsx_CheckoutAddresses_component_useVisibleTask_8_sbtJARtO0Ak-Cin8ntlH.js:1 undefined
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1 [Checkout] Updating PaymentIntent pi_3SFtOt5TAqA4yxs415gmUc1j for order RH000155
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 Updating PaymentIntent pi_3SFtOt5TAqA4yxs415gmUc1j amount to 8800
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 Stripe initialized successfully
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1 [Checkout] PaymentIntent amount updated
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 Updating PaymentIntent pi_3SFtOt5TAqA4yxs415gmUc1j metadata for order RH000155 (404)
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 PaymentIntent metadata updated successfully for order RH000155
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1 [Checkout] PaymentIntent metadata updated with order details
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 🔄 Attempting to transition order to state: ArrangingPayment
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 🔄 Raw GraphQL result: {
  "transitionOrderToState": {
    "__typename": "Order",
    "id": "404",
    "code": "RH000155",
    "active": true,
    "createdAt": "2025-10-08T09:11:42.160Z",
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
    "shippingWithTax": 800,
    "totalWithTax": 8800,
    "customer": {
      "id": "1",
      "firstName": "adrian",
      "lastName": "dsouza",
      "emailAddress": "adrdsouza@gmail.com"
    },
    "shippingAddress": {
      "fullName": "adrian dsouza",
      "streetLine1": "rua da cruz",
      "streetLine2": "",
      "company": "",
      "city": "sesimbra",
      "province": "ny",
      "postalCode": "29702",
      "countryCode": "US",
      "phoneNumber": ""
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
          "id": "3",
          "name": "USPS First class mail"
        },
        "priceWithTax": 800
      }
    ],
    "lines": [
      {
        "id": "21399",
        "unitPriceWithTax": 8000,
        "linePriceWithTax": 8000,
        "quantity": 1,
        "featuredAsset": {
          "id": "30",
          "preview": "https://rottenhand.com/assets/preview/73/ls__preview.jpg"
        },
        "productVariant": {
          "id": "64",
          "name": "Medium - Midnight black",
          "price": 8000,
          "stockLevel": "9007199254740991",
          "options": [
            {
              "id": "107",
              "code": "midnight-black",
              "name": "Midnight black",
              "group": {
                "id": "27",
                "name": "Color"
              }
            },
            {
              "id": "108",
              "code": "medium",
              "name": "Medium",
              "group": {
                "id": "26",
                "name": "Size"
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
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 ✅ Order state transition successful. New state: ArrangingPayment
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-A5QD94GZ.js:1 [Payment] Stripe trigger signal received: 1
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-A5QD94GZ.js:1 [Payment] Triggering Stripe payment for order: RH000155
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [StripePayment] Starting payment confirmation with order: Object
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [StripePayment] Submitting payment form...
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [StripePayment] Form submitted successfully, confirming payment with Stripe...
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
api.stripe.com/v1/payment_intents/pi_3SFtOt5TAqA4yxs415gmUc1j/confirm:1  Failed to load resource: the server responded with a status of 402 ()
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [StripePayment] Payment confirmation failed: Object
F.window.confirmStripePreOrderPayment @ StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: Object
handlePaymentError @ StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [PaymentErrorHandler] CONFIRM_PAYMENT: Object
handlePaymentError @ StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 [StripePayment] Payment confirmation failed - error will be shown in modal
Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-A5QD94GZ.js:1 [Payment] Stripe payment failed: Your card was declined. Please try a different card or payment method.
C @ Payment.tsx_Payment_component_handleDummyPayment_90oXzOQpWSY-A5QD94GZ.js:1
StripePayment.tsx_StripePayment_component_handleDismissError_wurYd8IrNko-Ddmbk6WY.js:1 Stripe initialized successfully
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1 [CHECKOUT] Payment error: Your card was declined. Please try a different card or payment method.
L @ index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1
index.tsx_CheckoutContent_component_div_div_div_div_div_div_div_Payment_onError_pYkLug0mIB0-BxNYWX_w.js:1 [CHECKOUT] Payment failed - modal will show error and refresh page
