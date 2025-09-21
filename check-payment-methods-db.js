#!/usr/bin/env node

/**
 * Script to check payment methods using GraphQL Admin API
 */

const fetch = require('node-fetch');

const ADMIN_API_URL = 'http://localhost:3000/admin-api';

// Admin API query to get payment methods
const GET_PAYMENT_METHODS_QUERY = `
  query GetPaymentMethods {
    paymentMethods {
      items {
        id
        code
        name
        description
        enabled
        createdAt
        updatedAt
        handler {
          code
          args {
            name
            value
          }
        }
      }
    }
  }
`;

// Query to get available payment method handlers
const GET_PAYMENT_METHOD_HANDLERS_QUERY = `
  query GetPaymentMethodHandlers {
    paymentMethodHandlers {
      code
      description
      args {
        name
        type
        required
        description
      }
    }
  }
`;

async function authenticateAdmin() {
  const loginMutation = `
    mutation Login {
      login(username: "superadmin", password: "superadmin") {
        ... on CurrentUser {
          id
          identifier
        }
        ... on ErrorResult {
          errorCode
          message
        }
      }
    }
  `;

  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: loginMutation }),
  });

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`Login failed: ${result.errors[0].message}`);
  }

  // Extract session cookie
  const cookies = response.headers.get('set-cookie');
  return cookies;
}

async function queryGraphQL(query, cookies) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || '',
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  
  if (result.errors) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }

  return result.data;
}

async function checkPaymentMethods() {
  try {
    console.log('🔐 Authenticating with admin API...');
    const cookies = await authenticateAdmin();
    console.log('✅ Authentication successful');

    console.log('\n📋 Checking registered payment methods:');
    const paymentMethodsData = await queryGraphQL(GET_PAYMENT_METHODS_QUERY, cookies);
    
    if (paymentMethodsData.paymentMethods.items.length === 0) {
      console.log('❌ No payment methods found');
    } else {
      console.log(`✅ Found ${paymentMethodsData.paymentMethods.items.length} payment method(s):`);
      paymentMethodsData.paymentMethods.items.forEach(method => {
        console.log(`\n  📄 Payment Method:`);
        console.log(`     ID: ${method.id}`);
        console.log(`     Code: ${method.code}`);
        console.log(`     Name: ${method.name}`);
        console.log(`     Description: ${method.description}`);
        console.log(`     Enabled: ${method.enabled}`);
        console.log(`     Handler Code: ${method.handler.code}`);
        console.log(`     Created: ${method.createdAt}`);
        if (method.handler.args && method.handler.args.length > 0) {
          console.log(`     Handler Args:`);
          method.handler.args.forEach(arg => {
            console.log(`       ${arg.name}: ${arg.value}`);
          });
        }
      });
    }

    console.log('\n🔧 Checking available payment method handlers:');
    const handlersData = await queryGraphQL(GET_PAYMENT_METHOD_HANDLERS_QUERY, cookies);
    
    if (handlersData.paymentMethodHandlers.length === 0) {
      console.log('❌ No payment method handlers found');
    } else {
      console.log(`✅ Found ${handlersData.paymentMethodHandlers.length} payment method handler(s):`);
      handlersData.paymentMethodHandlers.forEach(handler => {
        console.log(`\n  🔧 Handler:`);
        console.log(`     Code: ${handler.code}`);
        console.log(`     Description: ${handler.description}`);
        if (handler.args && handler.args.length > 0) {
          console.log(`     Arguments:`);
          handler.args.forEach(arg => {
            console.log(`       ${arg.name} (${arg.type}): ${arg.description} ${arg.required ? '[Required]' : '[Optional]'}`);
          });
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPaymentMethods().catch(console.error);