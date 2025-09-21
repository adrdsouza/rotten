/**
 * Comprehensive test suite for Stripe payment settlement flow
 * Tests all scenarios: successful payment, failed payment, API failures, and concurrent settlements
 * 
 * Requirements tested:
 * - 1.1: Conditional payment settlement after Stripe confirmation
 * - 2.1: Frontend-triggered payment confirmation with API verification
 * - 3.1: Reliable payment state management
 * - 5.1: Idempotent payment processing
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Connection } from 'typeorm';
import Stripe from 'stripe';
import { 
    StripePreOrderResolver, 
    StripePaymentSettlementService 
} from '../../src/plugins/stripe-pre-order/stripe-pre-order.plugin';
import { StripeApiService } from '../../src/plugins/stripe-pre-order/stripe-api.service';
import { StripeErrorHandlingService } from '../../src/plugins/stripe-pre-order/error-handling.service';
import { StripePaymentMetricsService } from '../../src/plugins/stripe-pre-order/stripe-payment-metrics.service';
import {
    RequestContext,
    TransactionalConnection,
    OrderService,
    PaymentService,
    PaymentMethodService,
    Order,
    Payment,
    Logger
} from '@vendure/core';

// Mock Stripe for testing
jest.mock('stripe');

describe('Stripe Payment Flow Integration Tests', () => {
    let app: INestApplication;
    let resolver: StripePreOrderResolver;
    let settlementService: StripePaymentSettlementService;
    let stripeApiService: StripeApiService;
    let mockStripe: jest.Mocked<Stripe>;
    let mockOrderService: jest.Mocked<OrderService>;
    let mockPaymentService: jest.Mocked<PaymentService>;
    let mockConnection: jest.Mocked<TransactionalConnection>;
    let mockRequestContext: RequestContext;

    // Test data
    const testPaymentIntentId = 'pi_test_1234567890';
    const testOrderId = 'order_test_123';
    const testOrderCode = 'ORDER-001';
    const testCustomerEmail = 'test@example.com';
    const testAmount = 2000; // $20.00 in cents

    beforeAll(async () => {
        // Set up test environment
        process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
        
        // Mock Stripe instance
        mockStripe = {
            paymentIntents: {
                create: jest.fn(),
                retrieve: jest.fn(),
                update: jest.fn(),
            },
        } as any;

        (Stripe as jest.MockedClass<typeof Stripe>).mockImplementation(() => mockStripe);

        // Create test module
        const moduleFixture: TestingModule = await Test.createTestingModule({
            providers: [
                StripePreOrderResolver,
                {
                    provide: TransactionalConnection,
                    useValue: {
                        transaction: jest.fn(),
                        createQueryBuilder: jest.fn(),
                    },
                },
                {
                    provide: OrderService,
                    useValue: {
                        findOne: jest.fn(),
                        findOneByCode: jest.fn(),
                    },
                },
                {
                    provide: PaymentService,
                    useValue: {
                        addPaymentToOrder: jest.fn(),
                    },
                },
                {
                    provide: PaymentMethodService,
                    useValue: {
                        findAll: jest.fn(),
                    },
                },
                {
                    provide: 'RequestContextService',
                    useValue: {},
                },
                {
                    provide: 'ChannelService',
                    useValue: {},
                },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        resolver = moduleFixture.get<StripePreOrderResolver>(StripePreOrderResolver);
        mockOrderService = moduleFixture.get(OrderService);
        mockPaymentService = moduleFixture.get(PaymentService);
        mockConnection = moduleFixture.get(TransactionalConnection);

        // Create mock request context
        mockRequestContext = {
            channel: { id: '1', code: 'default' },
            languageCode: 'en' as any,
        } as RequestContext;

        // Set up settlement service with mocked dependencies
        const metricsService = new StripePaymentMetricsService();
        stripeApiService = new StripeApiService(mockStripe, metricsService);
        const errorHandlingService = new StripeErrorHandlingService(metricsService);
        
        settlementService = new StripePaymentSettlementService(
            mockStripe,
            stripeApiService,
            mockConnection,
            mockOrderService,
            mockPaymentService,
            moduleFixture.get(PaymentMethodService),
            metricsService,
            errorHandlingService
        );
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Default mock setup for payment method
        mockPaymentService.addPaymentToOrder.mockResolvedValue({
            id: 'payment_123',
            transactionId: testPaymentIntentId,
        } as Payment);

        // Mock payment method service
        const mockPaymentMethodService = app.get(PaymentMethodService);
        mockPaymentMethodService.findAll = jest.fn().mockResolvedValue({
            items: [{
                id: '1',
                code: 'stripe-payment-intent',
                handler: { code: 'stripe-payment-intent' }
            }]
        });
    });

    describe('1. Successful Payment Flow', () => {
        /**
         * Test: PaymentIntent creation → linking → Stripe confirmation → API verification → settlement
         * Requirements: 1.1, 2.1, 3.1
         */
        it('should complete full successful payment flow', async () => {
            // Step 1: Create PaymentIntent
            const mockPaymentIntent = {
                id: testPaymentIntentId,
                client_secret: 'pi_test_client_secret',
                amount: testAmount,
                currency: 'usd',
                status: 'requires_payment_method',
                metadata: {}
            };

            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntent as any);

            const clientSecret = await resolver.createPreOrderStripePaymentIntent(testAmount, 'usd');
            expect(clientSecret).toBe('pi_test_client_secret');
            expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith({
                amount: testAmount,
                currency: 'usd',
                metadata: expect.objectContaining({
                    source: 'pre_order_validation',
                    estimated_total: testAmount.toString()
                })
            });

            // Step 2: Link PaymentIntent to order (metadata only, no settlement)
            const updatedPaymentIntent = {
                ...mockPaymentIntent,
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail,
                    source: 'order_linked',
                    final_total: testAmount.toString()
                }
            };

            mockStripe.paymentIntents.update.mockResolvedValue(updatedPaymentIntent as any);

            const linkResult = await resolver.linkPaymentIntentToOrder(
                testPaymentIntentId,
                testOrderId,
                testOrderCode,
                testAmount,
                testCustomerEmail,
                mockRequestContext
            );

            expect(linkResult).toBe(true);
            expect(mockStripe.paymentIntents.update).toHaveBeenCalledWith(
                testPaymentIntentId,
                expect.objectContaining({
                    amount: testAmount,
                    metadata: expect.objectContaining({
                        vendure_order_code: testOrderCode,
                        vendure_order_id: testOrderId,
                        vendure_customer_email: testCustomerEmail
                    })
                })
            );

            // Verify NO immediate settlement occurred
            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();

            // Step 3: Simulate Stripe confirmation (frontend would do this)
            const confirmedPaymentIntent = {
                ...updatedPaymentIntent,
                status: 'succeeded',
                latest_charge: 'ch_test_charge_123'
            };

            // Step 4: API verification and settlement
            mockStripe.paymentIntents.retrieve.mockResolvedValue(confirmedPaymentIntent as any);

            // Mock order lookup for settlement
            const mockOrder = {
                id: testOrderId,
                code: testOrderCode,
                state: 'ArrangingPayment',
                payments: []
            };

            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockOrder)
                    }),
                    findOne: jest.fn().mockResolvedValue(mockOrder)
                } as any);
            });

            const settlementResult = await resolver.settleStripePayment(
                testPaymentIntentId,
                mockRequestContext
            );

            expect(settlementResult).toBe(true);
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(testPaymentIntentId);
            expect(mockPaymentService.addPaymentToOrder).toHaveBeenCalledWith(
                mockRequestContext,
                testOrderId,
                expect.objectContaining({
                    method: 'stripe-payment-intent',
                    metadata: expect.objectContaining({
                        paymentIntentId: testPaymentIntentId,
                        customerEmail: testCustomerEmail,
                        amount: testAmount,
                        currency: 'usd',
                        orderCode: testOrderCode,
                        orderId: testOrderId
                    })
                })
            );
        });
    });

    describe('2. Failed Payment Scenarios', () => {
        /**
         * Test: Ensure orders stay in ArrangingPayment when Stripe payment fails
         * Requirements: 1.1, 2.1
         */
        it('should keep order in ArrangingPayment when Stripe payment fails', async () => {
            // Create PaymentIntent that fails
            const failedPaymentIntent = {
                id: testPaymentIntentId,
                status: 'payment_failed',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(failedPaymentIntent as any);

            // Attempt settlement - should fail
            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/payment.*failed|not.*succeeded/i);

            // Verify no payment was created
            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });

        it('should handle cancelled payments correctly', async () => {
            const cancelledPaymentIntent = {
                id: testPaymentIntentId,
                status: 'canceled',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(cancelledPaymentIntent as any);

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/payment.*canceled|not.*succeeded/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });

        it('should handle pending payments correctly', async () => {
            const pendingPaymentIntent = {
                id: testPaymentIntentId,
                status: 'processing',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(pendingPaymentIntent as any);

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/payment.*processing|not.*succeeded/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });
    });

    describe('3. API Failure Scenarios', () => {
        /**
         * Test: Verify proper error handling and retry mechanisms
         * Requirements: 2.1, 3.1
         */
        it('should handle Stripe API failures with retry logic', async () => {
            // Mock API failure then success
            mockStripe.paymentIntents.retrieve
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Rate limit'))
                .mockResolvedValueOnce({
                    id: testPaymentIntentId,
                    status: 'succeeded',
                    amount: testAmount,
                    currency: 'usd',
                    metadata: {
                        vendure_order_code: testOrderCode,
                        vendure_order_id: testOrderId,
                        vendure_customer_email: testCustomerEmail
                    }
                } as any);

            // Mock successful settlement after retries
            const mockOrder = {
                id: testOrderId,
                code: testOrderCode,
                state: 'ArrangingPayment',
                payments: []
            };

            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockOrder)
                    }),
                    findOne: jest.fn().mockResolvedValue(mockOrder)
                } as any);
            });

            const result = await resolver.settleStripePayment(testPaymentIntentId, mockRequestContext);

            expect(result).toBe(true);
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(3);
            expect(mockPaymentService.addPaymentToOrder).toHaveBeenCalled();
        });

        it('should fail gracefully after max retries', async () => {
            // Mock persistent API failure
            mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Persistent API failure'));

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/api.*failure|stripe.*error/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });

        it('should handle invalid PaymentIntent ID', async () => {
            const invalidPaymentIntentId = 'invalid_id';

            await expect(
                resolver.settleStripePayment(invalidPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/invalid.*paymentintent/i);

            expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });
    });

    describe('4. Concurrent Settlement Tests', () => {
        /**
         * Test: Ensure idempotency works correctly for concurrent settlements
         * Requirements: 5.1
         */
        it('should handle concurrent settlement requests idempotently', async () => {
            const succeededPaymentIntent = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(succeededPaymentIntent as any);

            // Mock order with existing payment (first request succeeds, second is duplicate)
            const mockOrderWithPayment = {
                id: testOrderId,
                code: testOrderCode,
                state: 'PaymentSettled',
                payments: [{
                    id: 'existing_payment_123',
                    transactionId: testPaymentIntentId,
                    metadata: { paymentIntentId: testPaymentIntentId }
                }]
            };

            let callCount = 0;
            mockConnection.transaction.mockImplementation(async (callback) => {
                callCount++;
                if (callCount === 1) {
                    // First call: no existing payment
                    return await callback({
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            setLock: jest.fn().mockReturnThis(),
                            getOne: jest.fn().mockResolvedValue({
                                ...mockOrderWithPayment,
                                payments: []
                            })
                        }),
                        findOne: jest.fn().mockResolvedValue({
                            ...mockOrderWithPayment,
                            payments: []
                        })
                    } as any);
                } else {
                    // Second call: existing payment found
                    return await callback({
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            setLock: jest.fn().mockReturnThis(),
                            getOne: jest.fn().mockResolvedValue(mockOrderWithPayment)
                        }),
                        findOne: jest.fn().mockResolvedValue(mockOrderWithPayment)
                    } as any);
                }
            });

            // Make concurrent settlement requests
            const [result1, result2] = await Promise.all([
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext),
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ]);

            // Both should succeed (idempotent)
            expect(result1).toBe(true);
            expect(result2).toBe(true);

            // Only one payment should be created
            expect(mockPaymentService.addPaymentToOrder).toHaveBeenCalledTimes(1);
        });

        it('should handle duplicate settlement gracefully', async () => {
            const succeededPaymentIntent = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(succeededPaymentIntent as any);

            // Mock order with existing payment
            const mockOrderWithExistingPayment = {
                id: testOrderId,
                code: testOrderCode,
                state: 'PaymentSettled',
                payments: [{
                    id: 'existing_payment_123',
                    transactionId: testPaymentIntentId,
                    metadata: { paymentIntentId: testPaymentIntentId }
                }]
            };

            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockOrderWithExistingPayment)
                    }),
                    findOne: jest.fn().mockResolvedValue(mockOrderWithExistingPayment)
                } as any);
            });

            const result = await resolver.settleStripePayment(testPaymentIntentId, mockRequestContext);

            expect(result).toBe(true);
            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });
    });

    describe('5. Edge Cases and Error Conditions', () => {
        it('should handle missing order metadata', async () => {
            const paymentIntentWithoutMetadata = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {} // Missing order metadata
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntentWithoutMetadata as any);

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/metadata|order.*code|order.*id/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });

        it('should handle order in invalid state', async () => {
            const succeededPaymentIntent = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(succeededPaymentIntent as any);

            // Mock order in invalid state for payment
            const mockOrderInvalidState = {
                id: testOrderId,
                code: testOrderCode,
                state: 'Delivered', // Invalid state for payment settlement
                payments: []
            };

            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockOrderInvalidState)
                    }),
                    findOne: jest.fn().mockResolvedValue(mockOrderInvalidState)
                } as any);
            });

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/state.*delivered.*cannot.*accept.*payment/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });

        it('should handle missing order', async () => {
            const succeededPaymentIntent = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(succeededPaymentIntent as any);

            // Mock order not found
            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(null)
                    }),
                    findOne: jest.fn().mockResolvedValue(null)
                } as any);
            });

            await expect(
                resolver.settleStripePayment(testPaymentIntentId, mockRequestContext)
            ).rejects.toThrow(/order.*not.*found/i);

            expect(mockPaymentService.addPaymentToOrder).not.toHaveBeenCalled();
        });
    });

    describe('6. Performance and Monitoring', () => {
        it('should log settlement timing metrics', async () => {
            const logSpy = jest.spyOn(Logger, 'info');

            const succeededPaymentIntent = {
                id: testPaymentIntentId,
                status: 'succeeded',
                amount: testAmount,
                currency: 'usd',
                metadata: {
                    vendure_order_code: testOrderCode,
                    vendure_order_id: testOrderId,
                    vendure_customer_email: testCustomerEmail
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(succeededPaymentIntent as any);

            const mockOrder = {
                id: testOrderId,
                code: testOrderCode,
                state: 'ArrangingPayment',
                payments: []
            };

            mockConnection.transaction.mockImplementation(async (callback) => {
                return await callback({
                    createQueryBuilder: jest.fn().mockReturnValue({
                        leftJoinAndSelect: jest.fn().mockReturnThis(),
                        where: jest.fn().mockReturnThis(),
                        setLock: jest.fn().mockReturnThis(),
                        getOne: jest.fn().mockResolvedValue(mockOrder)
                    }),
                    findOne: jest.fn().mockResolvedValue(mockOrder)
                } as any);
            });

            await resolver.settleStripePayment(testPaymentIntentId, mockRequestContext);

            // Verify timing logs were created
            expect(logSpy).toHaveBeenCalledWith(
                expect.stringMatching(/settlement.*completed.*successfully.*\d+ms/i),
                'StripePreOrderPlugin'
            );

            logSpy.mockRestore();
        });
    });
});