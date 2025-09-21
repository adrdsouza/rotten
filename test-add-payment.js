const fetch = require('node-fetch');

const GRAPHQL_API_URL = 'http://localhost:3000/shop-api';

// A simple fetch wrapper to handle GraphQL requests
async function callGraphQL(query, variables, headers = {}) {
    const response = await fetch(GRAPHQL_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
        body: JSON.stringify({ query, variables }),
    });
    const result = await response.json();
    if (result.errors) {
        console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
        throw new Error('GraphQL query failed');
    }
    // Extract the cookie for session management
    const setCookieHeader = response.headers.get('set-cookie');
    return { data: result.data, setCookieHeader };
}

const ADD_ITEM_TO_ORDER = `
    mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
        addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
            ... on Order { id code state active }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const SET_CUSTOMER_FOR_ORDER = `
    mutation SetCustomerForOrder($input: CreateCustomerInput!) {
        setCustomerForOrder(input: $input) {
            ... on Order { id customer { id } }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const SET_SHIPPING_ADDRESS = `
    mutation SetShippingAddress($input: CreateAddressInput!) {
        setOrderShippingAddress(input: $input) {
            ... on Order { id shippingAddress { countryCode } }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const GET_ELIGIBLE_SHIPPING_METHODS = `
    query GetEligibleShippingMethods {
        eligibleShippingMethods {
            id
            name
            price
        }
    }
`;

const SET_SHIPPING_METHOD = `
    mutation SetShippingMethod($id: ID!) {
        setOrderShippingMethod(shippingMethodId: [$id]) {
            ... on Order { id shippingLines { shippingMethod { id } } }
            ... on ErrorResult { errorCode message }
        }
    }
`;

const TRANSITION_TO_ARRANGING_PAYMENT = `
    mutation TransitionToArrangingPayment {
        transitionOrderToState(state: "ArrangingPayment") {
            ... on Order { id code state }
            ... on OrderStateTransitionError { errorCode message fromState toState transitionError }
        }
    }
`;

const ADD_PAYMENT_TO_ORDER = `
  mutation addPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order { id code state }
      ... on ErrorResult { errorCode message }
    }
  }
`;

async function testFullPaymentFlow() {
    let sessionCookie = null;
    try {
        // 1. Add item to order
        console.log('Step 1: Adding item to order...');
        const { data: addItemData, setCookieHeader } = await callGraphQL(ADD_ITEM_TO_ORDER, { productVariantId: '1', quantity: 1 });
        if (addItemData.addItemToOrder.errorCode) throw new Error(addItemData.addItemToOrder.message);
        console.log(`-> Order created: ${addItemData.addItemToOrder.code}`);
        sessionCookie = setCookieHeader;

        // 2. Set customer
        console.log('\nStep 2: Setting customer...');
        const customerInput = { firstName: 'Test', lastName: 'Customer', emailAddress: 'test@example.com' };
        const { data: customerData } = await callGraphQL(SET_CUSTOMER_FOR_ORDER, { input: customerInput }, { cookie: sessionCookie });
        if (customerData.setCustomerForOrder.errorCode) throw new Error(customerData.setCustomerForOrder.message);
        console.log(`-> Customer set for order`);

        // 3. Set shipping address
        console.log('\nStep 3: Setting shipping address...');
        const addressInput = { streetLine1: '123 Main St', countryCode: 'US' };
        const { data: addressData } = await callGraphQL(SET_SHIPPING_ADDRESS, { input: addressInput }, { cookie: sessionCookie });
        if (addressData.setOrderShippingAddress.errorCode) throw new Error(addressData.setOrderShippingAddress.message);
        console.log(`-> Shipping address set`);

        // 4. Get eligible shipping methods
        console.log('\nStep 4: Getting eligible shipping methods...');
        const { data: shippingMethodsData } = await callGraphQL(GET_ELIGIBLE_SHIPPING_METHODS, {}, { cookie: sessionCookie });
        const shippingMethod = shippingMethodsData.eligibleShippingMethods[0];
        if (!shippingMethod) throw new Error('No eligible shipping methods found');
        console.log(`-> Found shipping method: ${shippingMethod.name}`);

        // 5. Set shipping method
        console.log('\nStep 5: Setting shipping method...');
        const { data: setShippingData } = await callGraphQL(SET_SHIPPING_METHOD, { id: shippingMethod.id }, { cookie: sessionCookie });
        if (setShippingData.setOrderShippingMethod.errorCode) throw new Error(setShippingData.setOrderShippingMethod.message);
        console.log(`-> Shipping method set`);

        // 6. Transition order state
        console.log('\nStep 6: Transitioning order to "ArrangingPayment"...');
        const { data: transitionData } = await callGraphQL(TRANSITION_TO_ARRANGING_PAYMENT, {}, { cookie: sessionCookie });
        if (transitionData.transitionOrderToState.errorCode) throw new Error(transitionData.transitionOrderToState.message);
        console.log(`-> Order state is now: ${transitionData.transitionOrderToState.state}`);

        // 7. Add payment to order
        console.log('\nStep 7: Adding payment to order...');
        const paymentInput = { method: 'stripe-pre-order', metadata: { paymentIntentId: 'pi_123', amount: 10000 } };
        const { data: paymentData } = await callGraphQL(ADD_PAYMENT_TO_ORDER, { input: paymentInput }, { cookie: sessionCookie });

        console.log('\n--- Final Response ---');
        console.log(JSON.stringify(paymentData, null, 2));

    } catch (error) {
        console.error('\n--- Test Failed ---');
        console.error(error);
    }
}

testFullPaymentFlow();