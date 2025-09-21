/**
 * End-to-End Payment Flow Test
 * Simulates the complete payment flow from frontend perspective
 * Tests the integration between all components
 */

import axios from 'axios';
import { Logger } from '@vendure/core';

// Test configuration
const TEST_CONFIG = {
    backendUrl: process.env.TEST_BACKEND_URL || 'http://localhost:3000',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_fake_key',
    testTimeout: 30000,
    retryAttempts: 3,
    retryDelayMs: 1000
};

// Mock Stripe frontend SDK
const mockStripe = {
    confirmPayment: jest.fn(),
    retrievePaymentIntent: jest.fn()
};

describe('E2E Payment Flow Tests', () => {
    let testOrderId: string;
    let testOrderCode: string;
    let testPaymentIntentId: string;
    let testClientSecret: string;

    beforeAll(() => {
        // Set up test environment
        jest.setTimeout(TEST_CONFIG.testTimeout);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Generate test data
        testOrderId = `order_${Date.now()}`;
        testOrderCode = `ORDER-${Date.now()}`;
        testPaymentIntentId = `pi_test_${Date.now()}`;
        testClientSecret = `${testPaymentIntentId}_secret_test`;
    });

    describe('Complete Payment Flow Simulation', () => {
        /**
         * Test the complete flow as it would happen in production:
         * 1. Customer adds items to cart
         * 2. Frontend creates PaymentIntent for estimated total
         * 3. Customer proceeds to checkout, order is created
         * 4. PaymentIntent is linked to order (metadata only)
         * 5. Customer completes payment with Stripe
         * 6. Frontend calls settlement endpoint
         * 7. Backend verifies with Stripe API and settles payment
         */
        it('should complete successful payment flow end-to-end', async () => {
            const testAmount = 2500; // $25.00
            const testCustomerEmail = 'test@example.com';

            // Step 1: Create PaymentIntent (simulating frontend cart)
            const createPaymentIntentQuery = `
                mutation CreatePreOrderStripePaymentIntent($estimatedTotal: Float!, $currency: String!) {
                    createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency)
                }
            `;

            const createResponse = await makeGraphQLRequest(createPaymentIntentQuery, {
                estimatedTotal: testAmount,
                currency: 'usd'
            });

            expect(createResponse.data.createPreOrderStripePaymentIntent).toBeDefined();
            testClientSecret = createResponse.data.createPreOrderStripePaymentIntent;

            Logger.info(`✓ Step 1: PaymentIntent created with client secret: ${testClientSecret.substring(0, 20)}...`);

            // Step 2: Link PaymentIntent to order (simulating order creation)
            const linkPaymentIntentQuery = `
                mutation LinkPaymentIntentToOrder(
                    $paymentIntentId: String!,
                    $orderId: String!,
                    $orderCode: String!,
                    $finalTotal: Float!,
                    $customerEmail: String!
                ) {
                    linkPaymentIntentToOrder(
                        paymentIntentId: $paymentIntentId,
                        orderId: $orderId,
                        orderCode: $orderCode,
                        finalTotal: $finalTotal,
                        customerEmail: $customerEmail
                    )
                }
            `;

            const linkResponse = await makeGraphQLRequest(linkPaymentIntentQuery, {
                paymentIntentId: testPaymentIntentId,
                orderId: testOrderId,
                orderCode: testOrderCode,
                finalTotal: testAmount,
                customerEmail: testCustomerEmail
            });

            expect(linkResponse.data.linkPaymentIntentToOrder).toBe(true);

            Logger.info(`✓ Step 2: PaymentIntent ${testPaymentIntentId} linked to order ${testOrderCode}`);

            // Step 3: Simulate Stripe payment confirmation (frontend)
            mockStripe.confirmPayment.mockResolvedValue({
                paymentIntent: {
                    id: testPaymentIntentId,
                    status: 'succeeded',
                    client_secret: testClientSecret
                }
            });

            const stripeConfirmation = await mockStripe.confirmPayment({
                elements: {}, // Mock elements
                clientSecret: testClientSecret,
                confirmParams: {
                    return_url: `${TEST_CONFIG.backendUrl}/checkout/confirmation/${testOrderCode}`
                }
            });

            expect(stripeConfirmation.paymentIntent.status).toBe('succeeded');

            Logger.info(`✓ Step 3: Stripe payment confirmed successfully`);

            // Step 4: Settlement with API verification
            const settlePaymentQuery = `
                mutation SettleStripePayment($paymentIntentId: String!) {
                    settleStripePayment(paymentIntentId: $paymentIntentId)
                }
            `;

            const settlementResponse = await makeGraphQLRequest(settlePaymentQuery, {
                paymentIntentId: testPaymentIntentId
            });

            expect(settlementResponse.data.settleStripePayment).toBe(true);

            Logger.info(`✓ Step 4: Payment settled successfully`);

            // Step 5: Verify payment status
            const statusQuery = `
                query GetPaymentIntentStatus($paymentIntentId: String!) {
                    getPaymentIntentStatus(paymentIntentId: $paymentIntentId)
                }
            `;

            const statusResponse = await makeGraphQLRequest(statusQuery, {
                paymentIntentId: testPaymentIntentId
            });

            const statusInfo = JSON.parse(statusResponse.data.getPaymentIntentStatus);
            expect(statusInfo.status).toBe('succeeded');
            expect(statusInfo.canSettle).toBe(false); // Already settled

            Logger.info(`✓ Step 5: Payment status verified - ${statusInfo.status}`);

            Logger.info('🎉 Complete payment flow test passed successfully!');
        });

        /**
         * Test failed payment scenario
         */
        it('should handle failed payment correctly', async () => {
            const testAmount = 1500; // $15.00
            const testCustomerEmail = 'fail@example.com';

            // Create and link PaymentIntent
            const createResponse = await makeGraphQLRequest(`
                mutation CreatePreOrderStripePaymentIntent($estimatedTotal: Float!, $currency: String!) {
                    createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency)
                }
            `, {
                estimatedTotal: testAmount,
                currency: 'usd'
            });

            testClientSecret = createResponse.data.createPreOrderStripePaymentIntent;

            await makeGraphQLRequest(`
                mutation LinkPaymentIntentToOrder(
                    $paymentIntentId: String!,
                    $orderId: String!,
                    $orderCode: String!,
                    $finalTotal: Float!,
                    $customerEmail: String!
                ) {
                    linkPaymentIntentToOrder(
                        paymentIntentId: $paymentIntentId,
                        orderId: $orderId,
                        orderCode: $orderCode,
                        finalTotal: $finalTotal,
                        customerEmail: $customerEmail
                    )
                }
            `, {
                paymentIntentId: testPaymentIntentId,
                orderId: testOrderId,
                orderCode: testOrderCode,
                finalTotal: testAmount,
                customerEmail: testCustomerEmail
            });

            // Simulate failed Stripe payment
            mockStripe.confirmPayment.mockResolvedValue({
                error: {
                    type: 'card_error',
                    code: 'card_declined',
                    message: 'Your card was declined.'
                }
            });

            const stripeResult = await mockStripe.confirmPayment({
                elements: {},
                clientSecret: testClientSecret
            });

            expect(stripeResult.error).toBeDefined();
            expect(stripeResult.error.code).toBe('card_declined');

            Logger.info(`✓ Stripe payment failed as expected: ${stripeResult.error.message}`);

            // Attempt settlement should fail
            const settlementQuery = `
                mutation SettleStripePayment($paymentIntentId: String!) {
                    settleStripePayment(paymentIntentId: $paymentIntentId)
                }
            `;

            await expect(
                makeGraphQLRequest(settlementQuery, {
                    paymentIntentId: testPaymentIntentId
                })
            ).rejects.toThrow(/payment.*failed|not.*succeeded/i);

            Logger.info('✓ Settlement correctly rejected for failed payment');
        });

        /**
         * Test concurrent settlement attempts (idempotency)
         */
        it('should handle concurrent settlement attempts idempotently', async () => {
            const testAmount = 3000; // $30.00
            const testCustomerEmail = 'concurrent@example.com';

            // Set up PaymentIntent
            const createResponse = await makeGraphQLRequest(`
                mutation CreatePreOrderStripePaymentIntent($estimatedTotal: Float!, $currency: String!) {
                    createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency)
                }
            `, {
                estimatedTotal: testAmount,
                currency: 'usd'
            });

            testClientSecret = createResponse.data.createPreOrderStripePaymentIntent;

            await makeGraphQLRequest(`
                mutation LinkPaymentIntentToOrder(
                    $paymentIntentId: String!,
                    $orderId: String!,
                    $orderCode: String!,
                    $finalTotal: Float!,
                    $customerEmail: String!
                ) {
                    linkPaymentIntentToOrder(
                        paymentIntentId: $paymentIntentId,
                        orderId: $orderId,
                        orderCode: $orderCode,
                        finalTotal: $finalTotal,
                        customerEmail: $customerEmail
                    )
                }
            `, {
                paymentIntentId: testPaymentIntentId,
                orderId: testOrderId,
                orderCode: testOrderCode,
                finalTotal: testAmount,
                customerEmail: testCustomerEmail
            });

            // Simulate successful Stripe payment
            mockStripe.confirmPayment.mockResolvedValue({
                paymentIntent: {
                    id: testPaymentIntentId,
                    status: 'succeeded',
                    client_secret: testClientSecret
                }
            });

            await mockStripe.confirmPayment({
                elements: {},
                clientSecret: testClientSecret
            });

            // Make concurrent settlement requests
            const settlementQuery = `
                mutation SettleStripePayment($paymentIntentId: String!) {
                    settleStripePayment(paymentIntentId: $paymentIntentId)
                }
            `;

            const concurrentRequests = Array(3).fill(null).map(() =>
                makeGraphQLRequest(settlementQuery, {
                    paymentIntentId: testPaymentIntentId
                })
            );

            const results = await Promise.all(concurrentRequests);

            // All requests should succeed (idempotent)
            results.forEach((result, index) => {
                expect(result.data.settleStripePayment).toBe(true);
                Logger.info(`✓ Concurrent request ${index + 1} succeeded`);
            });

            Logger.info('✓ All concurrent settlement requests handled idempotently');
        });
    });

    describe('Error Recovery and Retry Logic', () => {
        /**
         * Test API failure recovery
         */
        it('should recover from temporary API failures', async () => {
            const testAmount = 2000;
            const testCustomerEmail = 'retry@example.com';

            // Set up PaymentIntent and link to order
            const createResponse = await makeGraphQLRequest(`
                mutation CreatePreOrderStripePaymentIntent($estimatedTotal: Float!, $currency: String!) {
                    createPreOrderStripePaymentIntent(estimatedTotal: $estimatedTotal, currency: $currency)
                }
            `, {
                estimatedTotal: testAmount,
                currency: 'usd'
            });

            testClientSecret = createResponse.data.createPreOrderStripePaymentIntent;

            await makeGraphQLRequest(`
                mutation LinkPaymentIntentToOrder(
                    $paymentIntentId: String!,
                    $orderId: String!,
                    $orderCode: String!,
                    $finalTotal: Float!,
                    $customerEmail: String!
                ) {
                    linkPaymentIntentToOrder(
                        paymentIntentId: $paymentIntentId,
                        orderId: $orderId,
                        orderCode: $orderCode,
                        finalTotal: $finalTotal,
                        customerEmail: $customerEmail
                    )
                }
            `, {
                paymentIntentId: testPaymentIntentId,
                orderId: testOrderId,
                orderCode: testOrderCode,
                finalTotal: testAmount,
                customerEmail: testCustomerEmail
            });

            // Simulate Stripe confirmation
            mockStripe.confirmPayment.mockResolvedValue({
                paymentIntent: {
                    id: testPaymentIntentId,
                    status: 'succeeded',
                    client_secret: testClientSecret
                }
            });

            await mockStripe.confirmPayment({
                elements: {},
                clientSecret: testClientSecret
            });

            // Test settlement with retry logic
            const settlementQuery = `
                mutation SettleStripePayment($paymentIntentId: String!) {
                    settleStripePayment(paymentIntentId: $paymentIntentId)
                }
            `;

            let attemptCount = 0;
            const maxAttempts = TEST_CONFIG.retryAttempts;

            while (attemptCount < maxAttempts) {
                try {
                    const result = await makeGraphQLRequest(settlementQuery, {
                        paymentIntentId: testPaymentIntentId
                    });

                    expect(result.data.settleStripePayment).toBe(true);
                    Logger.info(`✓ Settlement succeeded on attempt ${attemptCount + 1}`);
                    break;
                } catch (error) {
                    attemptCount++;
                    if (attemptCount >= maxAttempts) {
                        throw error;
                    }
                    Logger.info(`⚠ Settlement attempt ${attemptCount} failed, retrying...`);
                    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.retryDelayMs));
                }
            }
        });
    });

    /**
     * Helper function to make GraphQL requests
     */
    async function makeGraphQLRequest(query: string, variables: any = {}) {
        try {
            const response = await axios.post(`${TEST_CONFIG.backendUrl}/shop-api`, {
                query,
                variables
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-token' // Mock auth token
                },
                timeout: 10000
            });

            if (response.data.errors) {
                throw new Error(`GraphQL Error: ${JSON.stringify(response.data.errors)}`);
            }

            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`HTTP Error: ${error.response?.status} - ${error.response?.data || error.message}`);
            }
            throw error;
        }
    }
});