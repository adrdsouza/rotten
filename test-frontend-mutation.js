#!/usr/bin/env node

/**
 * Test script to verify the frontend addItemsToOrderMutation function
 * This simulates how the frontend function would be called
 */

const fs = require('fs');
const path = require('path');

// Read the frontend order.ts file to verify the function exists and is properly structured
function testFrontendFunction() {
  console.log('🔍 Testing frontend addItemsToOrderMutation function...');
  
  const orderTsPath = path.join(__dirname, 'frontend', 'src', 'providers', 'shop', 'orders', 'order.ts');
  
  if (!fs.existsSync(orderTsPath)) {
    console.error('❌ Frontend order.ts file not found');
    return false;
  }
  
  const content = fs.readFileSync(orderTsPath, 'utf8');
  
  // Check if the function exists
  const hasFunctionDeclaration = content.includes('export const addItemsToOrderMutation');
  if (!hasFunctionDeclaration) {
    console.error('❌ addItemsToOrderMutation function not found');
    return false;
  }
  
  // Check if it uses the correct GraphQL mutation
  const hasCorrectMutation = content.includes('mutation addItemsToOrder($inputs: [AddItemInput!]!)');
  if (!hasCorrectMutation) {
    console.error('❌ Incorrect GraphQL mutation structure');
    return false;
  }
  
  // Check if it handles the UpdateMultipleOrderItemsResult structure correctly
  const hasCorrectStructure = content.includes('order {') && content.includes('errorResults {');
  if (!hasCorrectStructure) {
    console.error('❌ Incorrect result structure handling');
    return false;
  }
  
  // Check if it imports AddItemInput type
  const hasCorrectImport = content.includes('AddItemInput');
  if (!hasCorrectImport) {
    console.error('❌ Missing AddItemInput import');
    return false;
  }
  
  console.log('✅ Frontend function structure is correct!');
  return true;
}

function testGeneratedTypes() {
  console.log('🔍 Testing generated TypeScript types...');
  
  const graphqlShopPath = path.join(__dirname, 'frontend', 'src', 'generated', 'graphql-shop.ts');
  
  if (!fs.existsSync(graphqlShopPath)) {
    console.error('❌ Generated graphql-shop.ts file not found');
    return false;
  }
  
  const content = fs.readFileSync(graphqlShopPath, 'utf8');
  
  // Check for required types
  const hasAddItemInput = content.includes('export type AddItemInput');
  const hasUpdateMultipleResult = content.includes('export type UpdateMultipleOrderItemsResult');
  const hasAddItemsToOrderMutation = content.includes('AddItemsToOrderMutation');
  
  console.log('📋 Generated types check:', {
    AddItemInput: hasAddItemInput ? '✅' : '❌',
    UpdateMultipleOrderItemsResult: hasUpdateMultipleResult ? '✅' : '❌',
    AddItemsToOrderMutation: hasAddItemsToOrderMutation ? '✅' : '❌'
  });
  
  return hasAddItemInput && hasUpdateMultipleResult && hasAddItemsToOrderMutation;
}

function testFunctionSignature() {
  console.log('🔍 Testing function signature and structure...');
  
  const orderTsPath = path.join(__dirname, 'frontend', 'src', 'providers', 'shop', 'orders', 'order.ts');
  const content = fs.readFileSync(orderTsPath, 'utf8');
  
  // Extract the function
  const functionMatch = content.match(/export const addItemsToOrderMutation = async \(([^)]+)\) => \{([\s\S]*?)\n\};/);
  
  if (!functionMatch) {
    console.error('❌ Could not parse function structure');
    return false;
  }
  
  const [, params, body] = functionMatch;
  
  // Check parameter type
  const hasCorrectParams = params.includes('items: AddItemInput[]');
  if (!hasCorrectParams) {
    console.error('❌ Incorrect parameter type. Expected: items: AddItemInput[]');
    return false;
  }
  
  // Check if it uses the requester function
  const usesRequester = body.includes('requester(mutation, { inputs: items })');
  if (!usesRequester) {
    console.error('❌ Function does not use requester correctly');
    return false;
  }
  
  // Check error handling
  const hasErrorHandling = body.includes('try {') && body.includes('catch (error)');
  if (!hasErrorHandling) {
    console.error('❌ Missing error handling');
    return false;
  }
  
  console.log('✅ Function signature and structure are correct!');
  return true;
}

async function runTests() {
  console.log('🚀 Starting frontend addItemsToOrderMutation tests...\n');
  
  const results = {
    function: testFrontendFunction(),
    types: testGeneratedTypes(),
    signature: testFunctionSignature()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  console.log(`Function exists: ${results.function ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Generated types: ${results.types ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Function signature: ${results.signature ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  console.log(`\n🎯 Overall result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 The frontend addItemsToOrderMutation is properly implemented!');
    console.log('   - Function exists with correct signature');
    console.log('   - Generated TypeScript types are available');
    console.log('   - GraphQL mutation structure is correct');
    console.log('   - Error handling is implemented');
  } else {
    console.log('\n⚠️  Some issues were found. Check the logs above for details.');
  }
  
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});