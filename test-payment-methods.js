#!/usr/bin/env node

/**
 * Test script to check available payment methods and test payment flow
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:3000/shop-api';

// Query to get available payment methods
const GET_PAYMENT_METHODS = `
  query {
    eligiblePaymentMethods {
      id
      code
      name
      description
      isEligible
    }
  }
`;

// Query to get products for creating an order
const GET_PRODUCTS = `
  query {
    products(options: { take: 1 }) {
      items {
        id
        name
        variants {
          id
          name
          price
        }
      }
    }
  }
`;

// Mutation to add item to order
const ADD_ITEM_TO_ORDER = `
  mutation addItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        state
        total
        lines {
          id
          quantity
          productVariant {
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

// Mutation to add payment to order
const ADD_PAYMENT_TO_ORDER = `
  mutation addPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        payments {
          id
          state
          amount
          method
          metadata
        }
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

async function makeGraphQLRequest(query, variables = {}) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  
  return await response.json();
}

async function testPaymentMethods() {
  console.log('🔍 Checking available payment methods...');
  
  try {
    const result = await makeGraphQLRequest(GET_PAYMENT_METHODS);
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return;
    }
    
    console.log('📋 Available payment methods:');
    console.log(JSON.stringify(result.data.eligiblePaymentMethods, null, 2));
    
    return result.data.eligiblePaymentMethods;
  } catch (error) {
    console.error('❌ Error fetching payment methods:', error.message);
  }
}

async function createTestOrder() {
  console.log('\n🛒 Creating test order...');
  
  try {
    // First get a product
    const productsResult = await makeGraphQLRequest(GET_PRODUCTS);
    
    if (productsResult.errors || !productsResult.data.products.items.length) {
      console.error('❌ No products available for testing');
      return null;
    }
    
    const product = productsResult.data.products.items[0];
    const variant = product.variants[0];
    
    console.log(`📦 Adding product: ${product.name} (${variant.name})`);
    
    // Add item to order
    const orderResult = await makeGraphQLRequest(ADD_ITEM_TO_ORDER, {
      productVariantId: variant.id,
      quantity: 1
    });
    
    if (orderResult.errors) {
      console.error('❌ Error creating order:', orderResult.errors);
      return null;
    }
    
    if (orderResult.data.addItemToOrder.errorCode) {
      console.error('❌ Order error:', orderResult.data.addItemToOrder.message);
      return null;
    }
    
    const order = orderResult.data.addItemToOrder;
    console.log(`✅ Order created: ${order.code} (Total: ${order.total})`);
    
    return order;
  } catch (error) {
    console.error('❌ Error creating test order:', error.message);
    return null;
  }
}

async function testPaymentFlow(paymentMethods) {
  console.log('\n💳 Testing payment flow...');
  
  // Create a test order first
  const order = await createTestOrder();
  if (!order) {
    console.error('❌ Cannot test payment without an order');
    return;
  }
  
  // Find stripe payment method
  const stripeMethod = paymentMethods.find(method => 
    method.code === 'stripe' || method.code === 'stripe-pre-order'
  );
  
  if (!stripeMethod) {
    console.error('❌ No Stripe payment method found');
    console.log('Available methods:', paymentMethods.map(m => m.code));
    return;
  }
  
  console.log(`🎯 Testing with payment method: ${stripeMethod.code}`);
  
  try {
    const paymentInput = {
      method: stripeMethod.code,
      metadata: {
        paymentIntentId: 'pi_test_1234567890',
        amount: order.total,
        currency: 'usd'
      }
    };
    
    console.log('📤 Payment input:', JSON.stringify(paymentInput, null, 2));
    
    const result = await makeGraphQLRequest(ADD_PAYMENT_TO_ORDER, {
      input: paymentInput
    });
    
    console.log('📥 Payment result:', JSON.stringify(result, null, 2));
    
    if (result.data.addPaymentToOrder.errorCode) {
      console.error(`❌ Payment failed: ${result.data.addPaymentToOrder.message}`);
    } else {
      console.log('✅ Payment successful!');
    }
    
  } catch (error) {
    console.error('❌ Error testing payment:', error.message);
  }
}

async function runTests() {
  console.log('🧪 Starting payment method tests...\n');
  
  const paymentMethods = await testPaymentMethods();
  
  if (paymentMethods && paymentMethods.length > 0) {
    await testPaymentFlow(paymentMethods);
  }
  
  console.log('\n✅ Tests completed!');
}

runTests().catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});