const fetch = require('node-fetch');

// Configuration
const BACKEND_URL = 'http://localhost:3000/shop-api';
const ADMIN_URL = 'http://localhost:3000/admin-api';

// Test data
const testProductVariantId = '1'; // You may need to adjust this
const testCustomer = {
  firstName: 'Test',
  lastName: 'Customer',
  emailAddress: 'test@example.com',
  phoneNumber: '+1234567890'
};

const testAddress = {
  fullName: 'Test Customer',
  streetLine1: '123 Test Street',
  city: 'Test City',
  province: 'Test Province',
  postalCode: '12345',
  countryCode: 'US',
  phoneNumber: '+1234567890'
};

// GraphQL queries and mutations
const GET_ACTIVE_ORDER = `
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      active
      totalWithTax
      totalQuantity
      lines {
        id
        quantity
        unitPriceWithTax
        linePriceWithTax
        productVariant {
          id
          name
          product {
            name
          }
        }
      }
      customer {
        id
        firstName
        lastName
        emailAddress
      }
    }
  }
`;

const ADD_ITEM_TO_ORDER = `
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        totalWithTax
        totalQuantity
        lines {
          id
          quantity
          unitPriceWithTax
          productVariant {
            id
            name
          }
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const SET_CUSTOMER_FOR_ORDER = `
  mutation SetCustomerForOrder($input: CreateCustomerInput!) {
    setCustomerForOrder(input: $input) {
      ... on Order {
        id
        customer {
          id
          firstName
          lastName
          emailAddress
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const SET_SHIPPING_ADDRESS = `
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
        shippingAddress {
          fullName
          streetLine1
          city
          province
          postalCode
          countryCode
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const GET_SHIPPING_METHODS = `
  query GetShippingMethods {
    eligibleShippingMethods {
      id
      name
      description
      priceWithTax
    }
  }
`;

const SET_SHIPPING_METHOD = `
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        shippingWithTax
        totalWithTax
        shippingLines {
          shippingMethod {
            id
            name
          }
          priceWithTax
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

const TRANSITION_ORDER_TO_STATE = `
  mutation TransitionOrderToState($state: String!) {
    transitionOrderToState(state: $state) {
      ... on Order {
        id
        state
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        fromState
        toState
        transitionError
      }
    }
  }
`;

// Helper function to make GraphQL requests
async function graphqlRequest(query, variables = {}, url = BACKEND_URL) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables
      })
    });

    const result = await response.json();
    
    if (result.errors) {
      console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    }
    
    return result;
  } catch (error) {
    console.error('Request failed:', error.message);
    return { error: error.message };
  }
}

// Test functions
async function testGetActiveOrder() {
  console.log('\n=== Testing Get Active Order ===');
  const result = await graphqlRequest(GET_ACTIVE_ORDER);
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.activeOrder;
}

async function testAddItemToOrder() {
  console.log('\n=== Testing Add Item to Order ===');
  const result = await graphqlRequest(ADD_ITEM_TO_ORDER, {
    productVariantId: testProductVariantId,
    quantity: 1
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.addItemToOrder;
}

async function testSetCustomerForOrder() {
  console.log('\n=== Testing Set Customer for Order ===');
  const result = await graphqlRequest(SET_CUSTOMER_FOR_ORDER, {
    input: testCustomer
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.setCustomerForOrder;
}

async function testSetShippingAddress() {
  console.log('\n=== Testing Set Shipping Address ===');
  const result = await graphqlRequest(SET_SHIPPING_ADDRESS, {
    input: testAddress
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.setOrderShippingAddress;
}

async function testGetShippingMethods() {
  console.log('\n=== Testing Get Shipping Methods ===');
  const result = await graphqlRequest(GET_SHIPPING_METHODS);
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.eligibleShippingMethods;
}

async function testSetShippingMethod(shippingMethodId) {
  console.log('\n=== Testing Set Shipping Method ===');
  const result = await graphqlRequest(SET_SHIPPING_METHOD, {
    shippingMethodId: [shippingMethodId]
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.setOrderShippingMethod;
}

async function testTransitionOrderToState(state) {
  console.log(`\n=== Testing Transition Order to State: ${state} ===`);
  const result = await graphqlRequest(TRANSITION_ORDER_TO_STATE, {
    state
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  return result.data?.transitionOrderToState;
}

// Main test flow
async function runFullOrderTest() {
  console.log('🚀 Starting Backend Order Flow Test');
  console.log('Backend URL:', BACKEND_URL);
  
  try {
    // Step 1: Check initial active order
    let activeOrder = await testGetActiveOrder();
    
    // Step 2: Add item to order
    const addItemResult = await testAddItemToOrder();
    if (addItemResult?.errorCode) {
      console.error('❌ Failed to add item to order:', addItemResult.message);
      return;
    }
    
    // Step 3: Get updated active order
    activeOrder = await testGetActiveOrder();
    if (!activeOrder) {
      console.error('❌ No active order found after adding item');
      return;
    }
    
    console.log('✅ Order created with ID:', activeOrder.id);
    
    // Step 4: Set customer
    const customerResult = await testSetCustomerForOrder();
    if (customerResult?.errorCode) {
      console.error('❌ Failed to set customer:', customerResult.message);
      return;
    }
    
    // Step 5: Set shipping address
    const addressResult = await testSetShippingAddress();
    if (addressResult?.errorCode) {
      console.error('❌ Failed to set shipping address:', addressResult.message);
      return;
    }
    
    // Step 6: Get shipping methods
    const shippingMethods = await testGetShippingMethods();
    if (!shippingMethods || shippingMethods.length === 0) {
      console.error('❌ No shipping methods available');
      return;
    }
    
    console.log('✅ Available shipping methods:', shippingMethods.length);
    
    // Step 7: Set shipping method (use first available)
    const shippingResult = await testSetShippingMethod(shippingMethods[0].id);
    if (shippingResult?.errorCode) {
      console.error('❌ Failed to set shipping method:', shippingResult.message);
      return;
    }
    
    // Step 8: Transition to ArrangingPayment
    const transitionResult = await testTransitionOrderToState('ArrangingPayment');
    if (transitionResult?.errorCode) {
      console.error('❌ Failed to transition to ArrangingPayment:', transitionResult.message);
      console.error('From state:', transitionResult.fromState);
      console.error('To state:', transitionResult.toState);
      console.error('Transition error:', transitionResult.transitionError);
      return;
    }
    
    // Final check
    activeOrder = await testGetActiveOrder();
    console.log('\n🎉 Order flow completed successfully!');
    console.log('Final order state:', activeOrder?.state);
    console.log('Order total:', activeOrder?.totalWithTax);
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run the test
if (require.main === module) {
  runFullOrderTest().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runFullOrderTest,
  testGetActiveOrder,
  testAddItemToOrder,
  testSetCustomerForOrder,
  testSetShippingAddress,
  testGetShippingMethods,
  testSetShippingMethod,
  testTransitionOrderToState
};