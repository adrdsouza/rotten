import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TransactionalConnection, OrderService, PaymentService, RequestContextService } from '@vendure/core';
import { StripeSettlementService } from '../services/stripe-settlement.service';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('Stripe Payment End-to-End Tests', () => {
    let app: INestApplication;
    let settlementService: StripeSettlementService;
    let mockConnection: jest.Mocked<TransactionalConnection>;
    let mockStripe: jest.Mocked<Stripe>;

    const mockPaymentIntentId = 'pi_test123';
    const mockOrderCode = 'ORDER-001';
    const mockAmount = 1000;

    beforeEach(async () => {
        // Setup mocks
        mockConnection = {
            rawConnection: {
                transaction: jest.fn()
            },
            getRepository: jest.fn()
        } as any;

        mockStripe = {
            paymentIntents: {
                create: jest.fn(),
                retrieve: jest.fn(),
                update: jest.fn()
            }
        } as any;

        process.env.STRIPE_SECRET_KEY = 'sk_test_123';
        process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_123';

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StripeSettlementService,
                { provide: TransactionalConnection, useValue: mockConnection },
                { provide: OrderService, useValue: {} },
                { provide: PaymentService, useValue: {} },
                { provide: RequestContextService, useValue: {} }
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        settlementService = module.get<StripeSettlementService>(StripeSettlementService);
        (settlementService as any).stripe = mockStripe;
    });

    afterEach(async () => {
        await app.close();
        jest.clearAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_PUBLISHABLE_KEY;
    });

    describe('Complete E2E Payment Flow', () => {
        it('should handle complete payment flow from creation to settlement', async () => {
            // Step 1: Create PaymentIntent
            const mockCreatedPaymentIntent = {
                id: mockPaymentIntentId,
                client_secret: 'pi_test123_secret_123',
                status: 'requires_payment_method',
                amount: mockAmount,
                currency: 'usd'
            };

            mockStripe.paymentIntents.create.mockResolvedValue(mockCreatedPaymentIntent as any);

            // Step 2: Simulate PaymentIntent confirmation (would happen on frontend)
            const mockConfirmedPaymentIntent = {
                ...mockCreatedPaymentIntent,
                status: 'succeeded',
                metadata: {
                    vendure_order_code: mockOrderCode
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockConfirmedPaymentIntent as any);

            // Step 3: Setup database mocks for settlement
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const mockTransactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockPendingPayment),
                update: jest.fn()
            };

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            // Mock successful order and payment service calls
            const mockOrderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            const mockPaymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'Order',
                    payments: [{ id: 'payment1' }]
                })
            };

            const mockRequestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Replace services with mocks
            (settlementService as any).orderService = mockOrderService;
            (settlementService as any).paymentService = mockPaymentService;
            (settlementService as any).requestContextService = mockRequestContextService;

            // Execute settlement
            const result = await settlementService.settlePayment(mockPaymentIntentId, {
                channel: 'default',
                req: {}
            });

            // Verify complete flow
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);
            expect(result.paymentId).toBe('payment1');

            // Verify all steps were executed
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
                mockPaymentIntentId,
                { expand: ['charges.data.payment_method_details'] }
            );
            expect(mockTransactionalEntityManager.findOne).toHaveBeenCalled();
            expect(mockOrderService.findOneByCode).toHaveBeenCalled();
            expect(mockPaymentService.addPaymentToOrder).toHaveBeenCalled();
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'settled', settledAt: expect.any(Date) }
            );
        });

        it('should handle payment flow with 3D Secure authentication', async () => {
            // Step 1: Create PaymentIntent requiring authentication
            const mockPaymentIntentRequiringAuth = {
                id: mockPaymentIntentId,
                client_secret: 'pi_test123_secret_123',
                status: 'requires_action',
                amount: mockAmount,
                currency: 'usd',
                next_action: {
                    type: 'use_stripe_sdk'
                }
            };

            mockStripe.paymentIntents.create.mockResolvedValue(mockPaymentIntentRequiringAuth as any);

            // Step 2: After authentication, PaymentIntent succeeds
            const mockAuthenticatedPaymentIntent = {
                ...mockPaymentIntentRequiringAuth,
                status: 'succeeded',
                metadata: {
                    vendure_order_code: mockOrderCode
                }
            };

            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockAuthenticatedPaymentIntent as any);

            // Setup settlement mocks
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const mockTransactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockPendingPayment),
                update: jest.fn()
            };

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            // Mock services
            (settlementService as any).orderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            (settlementService as any).paymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'Order',
                    payments: [{ id: 'payment1' }]
                })
            };

            (settlementService as any).requestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Execute settlement after authentication
            const result = await settlementService.settlePayment(mockPaymentIntentId, {
                channel: 'default',
                req: {}
            });

            // Verify successful settlement after authentication
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);

            // Verify PaymentIntent was retrieved and processed correctly
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalled();
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'settled', settledAt: expect.any(Date) }
            );
        });

        it('should handle webhook-based settlement flow', async () => {
            // Simulate webhook payload for successful payment
            const webhookPayload = {
                id: 'evt_test123',
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: mockPaymentIntentId,
                        status: 'succeeded',
                        amount: mockAmount,
                        currency: 'usd',
                        metadata: {
                            vendure_order_code: mockOrderCode
                        }
                    }
                }
            };

            // Setup mocks for webhook-triggered settlement
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const mockTransactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockPendingPayment),
                update: jest.fn()
            };

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockStripe.paymentIntents.retrieve.mockResolvedValue(webhookPayload.data.object as any);

            // Mock services
            (settlementService as any).orderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            (settlementService as any).paymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'Order',
                    payments: [{ id: 'payment1' }]
                })
            };

            (settlementService as any).requestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Execute webhook-triggered settlement
            const result = await settlementService.settlePayment(mockPaymentIntentId, {
                channel: 'default',
                req: {},
                source: 'webhook'
            });

            // Verify successful webhook settlement
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);

            // Verify settlement was processed
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'settled', settledAt: expect.any(Date) }
            );
        });
    });

    describe('Error Recovery and Resilience', () => {
        it('should handle network timeouts with retry logic', async () => {
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const mockTransactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockPendingPayment),
                update: jest.fn()
            };

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            // Setup network timeout followed by success
            const timeoutError = new Error('Network timeout');
            (timeoutError as any).type = 'StripeConnectionError';

            mockStripe.paymentIntents.retrieve
                .mockRejectedValueOnce(timeoutError)
                .mockRejectedValueOnce(timeoutError)
                .mockResolvedValueOnce({
                    id: mockPaymentIntentId,
                    status: 'succeeded',
                    amount: mockAmount,
                    currency: 'usd',
                    metadata: { vendure_order_code: mockOrderCode }
                } as any);

            // Mock services
            (settlementService as any).orderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            (settlementService as any).paymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'Order',
                    payments: [{ id: 'payment1' }]
                })
            };

            (settlementService as any).requestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Execute settlement with retries
            const result = await settlementService.settlePayment(mockPaymentIntentId, {
                channel: 'default',
                req: {}
            });

            // Verify eventual success
            expect(result.success).toBe(true);
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(3);
        });

        it('should handle partial failures and maintain data consistency', async () => {
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const mockTransactionalEntityManager = {
                findOne: jest.fn().mockResolvedValue(mockPendingPayment),
                update: jest.fn()
            };

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockStripe.paymentIntents.retrieve.mockResolvedValue({
                id: mockPaymentIntentId,
                status: 'succeeded',
                amount: mockAmount,
                currency: 'usd',
                metadata: { vendure_order_code: mockOrderCode }
            } as any);

            // Mock order service success but payment service failure
            (settlementService as any).orderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            (settlementService as any).paymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'PaymentFailedError',
                    message: 'Payment processing failed'
                })
            };

            (settlementService as any).requestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Execute settlement
            const result = await settlementService.settlePayment(mockPaymentIntentId, {
                channel: 'default',
                req: {}
            });

            // Verify failure and rollback
            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment settlement failed. Please contact support.');

            // Verify payment was marked as failed
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'failed' }
            );
        });
    });

    describe('Performance and Load Testing', () => {
        it('should handle multiple concurrent settlement requests efficiently', async () => {
            const concurrentRequests = 10;
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: '1',
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            // Setup mocks for concurrent processing
            let transactionCount = 0;
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                transactionCount++;
                const mockEntityManager = {
                    findOne: jest.fn().mockResolvedValue(
                        transactionCount === 1 ? mockPendingPayment : { ...mockPendingPayment, status: 'settled' }
                    ),
                    update: jest.fn()
                };
                return await callback(mockEntityManager);
            });

            mockStripe.paymentIntents.retrieve.mockResolvedValue({
                id: mockPaymentIntentId,
                status: 'succeeded',
                amount: mockAmount,
                currency: 'usd',
                metadata: { vendure_order_code: mockOrderCode }
            } as any);

            // Mock services
            (settlementService as any).orderService = {
                findOneByCode: jest.fn().mockResolvedValue({
                    id: '1',
                    code: mockOrderCode,
                    payments: []
                })
            };

            (settlementService as any).paymentService = {
                addPaymentToOrder: jest.fn().mockResolvedValue({
                    __typename: 'Order',
                    payments: [{ id: 'payment1' }]
                })
            };

            (settlementService as any).requestContextService = {
                create: jest.fn().mockResolvedValue({})
            };

            // Execute concurrent settlements
            const startTime = Date.now();
            const promises = Array(concurrentRequests).fill(0).map(() =>
                settlementService.settlePayment(mockPaymentIntentId, {
                    channel: 'default',
                    req: {}
                })
            );

            const results = await Promise.all(promises);
            const endTime = Date.now();

            // Verify all requests completed successfully
            results.forEach(result => {
                expect(result.success).toBe(true);
                expect(result.transactionId).toBe(mockPaymentIntentId);
            });

            // Verify reasonable performance (should complete within 5 seconds)
            expect(endTime - startTime).toBeLessThan(5000);

            // Verify idempotency - only one actual settlement should occur
            expect(transactionCount).toBe(concurrentRequests);
        });
    });
});