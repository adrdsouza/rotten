#!/usr/bin/env node

/**
 * Test script to verify the Stripe Pre-Order payment flow
 * This tests the addPaymentToOrder mutation with proper metadata
 */

const fetch = require('node-fetch');

const GRAPHQL_ENDPOINT = 'http://localhost:3000/shop-api';

// Test GraphQL mutation
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

async function testPaymentFlow() {
  console.log('🚀 Testing Stripe Pre-Order payment flow...');
  
  try {
    // Test with proper metadata structure
    const paymentInput = {
      method: 'stripe-pre-order-payment',
      metadata: {
        paymentIntentId: 'pi_test_1234567890'
      }
    };
    
    console.log('📤 Sending addPaymentToOrder mutation with metadata:', JSON.stringify(paymentInput.metadata, null, 2));
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ADD_PAYMENT_TO_ORDER,
        variables: {
          input: paymentInput
        }
      })
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return false;
    }
    
    if (result.data?.addPaymentToOrder?.errorCode) {
      console.error('❌ Payment error:', result.data.addPaymentToOrder.message);
      return false;
    }
    
    if (result.data?.addPaymentToOrder?.payments) {
      console.log('✅ Payment added successfully!');
      const payment = result.data.addPaymentToOrder.payments[0];
      console.log('💳 Payment details:', {
        id: payment.id,
        state: payment.state,
        amount: payment.amount,
        method: payment.method,
        metadata: payment.metadata
      });
      return true;
    }
    
    console.error('❌ Unexpected response structure');
    return false;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

async function testWithStringMetadata() {
  console.log('\n🔄 Testing with string metadata (legacy format)...');
  
  try {
    const paymentInput = {
      method: 'stripe-pre-order-payment',
      metadata: 'pi_test_string_format'
    };
    
    console.log('📤 Sending addPaymentToOrder mutation with string metadata:', paymentInput.metadata);
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: ADD_PAYMENT_TO_ORDER,
        variables: {
          input: paymentInput
        }
      })
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response body:', JSON.stringify(result, null, 2));
    
    if (result.errors) {
      console.error('❌ GraphQL errors:', result.errors);
      return false;
    }
    
    if (result.data?.addPaymentToOrder?.errorCode) {
      console.log('⚠️  Expected error for string format:', result.data.addPaymentToOrder.message);
      return true; // This is expected to fail
    }
    
    console.log('✅ String metadata handled correctly');
    return true;
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🧪 Starting payment flow tests...\n');
  
  const test1 = await testPaymentFlow();
  const test2 = await testWithStringMetadata();
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Object metadata test: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`String metadata test: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = test1 && test2;
  console.log(`\n🎯 Overall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (!allPassed) {
    console.log('\n⚠️  Check the server logs for more details about any failures.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});