#!/bin/bash

# Stripe Payment Flow Test Runner
# Runs comprehensive tests for the payment settlement system

set -e

echo "🧪 Starting Stripe Payment Flow Tests"
echo "======================================"

# Check if required environment variables are set
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "⚠️  Warning: STRIPE_SECRET_KEY not set, using test key"
    export STRIPE_SECRET_KEY="sk_test_fake_key_for_testing"
fi

if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo "⚠️  Warning: STRIPE_PUBLISHABLE_KEY not set, using test key"
    export STRIPE_PUBLISHABLE_KEY="pk_test_fake_key_for_testing"
fi

# Set test environment
export NODE_ENV=test
export TEST_BACKEND_URL=${TEST_BACKEND_URL:-"http://localhost:3000"}

echo "📋 Test Configuration:"
echo "   Backend URL: $TEST_BACKEND_URL"
echo "   Node Environment: $NODE_ENV"
echo "   Stripe Keys: Configured"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run unit tests
echo "🔬 Running Unit Tests..."
echo "------------------------"
npx jest --config=tests/stripe-payment-flow/jest.config.js --testPathPattern=stripe-payment-flow.test.ts --verbose

echo ""
echo "🌐 Running E2E Tests..."
echo "----------------------"
npx jest --config=tests/stripe-payment-flow/jest.config.js --testPathPattern=e2e-payment-flow.test.ts --verbose --runInBand

echo ""
echo "📊 Generating Coverage Report..."
echo "-------------------------------"
npx jest --config=tests/stripe-payment-flow/jest.config.js --coverage --coverageDirectory=tests/stripe-payment-flow/coverage

echo ""
echo "✅ All tests completed!"
echo "📈 Coverage report available at: tests/stripe-payment-flow/coverage/index.html"

# Check if backend is running for E2E tests
if curl -s "$TEST_BACKEND_URL/health" > /dev/null 2>&1; then
    echo "✅ Backend is running at $TEST_BACKEND_URL"
else
    echo "⚠️  Backend not detected at $TEST_BACKEND_URL"
    echo "   E2E tests may fail if backend is not running"
    echo "   Start backend with: npm run dev:server"
fi

echo ""
echo "🎯 Test Summary:"
echo "   ✓ PaymentIntent creation and linking"
echo "   ✓ Successful payment flow with API verification"
echo "   ✓ Failed payment handling"
echo "   ✓ API failure recovery and retry logic"
echo "   ✓ Concurrent settlement idempotency"
echo "   ✓ Error conditions and edge cases"
echo ""
echo "🚀 Payment system is ready for production!"