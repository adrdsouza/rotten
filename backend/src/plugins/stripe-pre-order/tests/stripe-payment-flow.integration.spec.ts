import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TransactionalConnection, OrderService, PaymentService, RequestContextService, Order } from '@vendure/core';
import { StripeSettlementService } from '../services/stripe-settlement.service';
import { StripeSettlementMetricsService } from '../services/stripe-settlement-metrics.service';
import { StripeSettlementLoggerService } from '../services/stripe-settlement-logger.service';
import { StripeErrorHandlerService } from '../services/stripe-error-handler.service';
import { StripeOrderStateManagerService } from '../services/stripe-order-state-manager.service';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('Stripe Payment Flow Integration Tests', () => {
    let app: INestApplication;
    let settlementService: StripeSettlementService;
    let mockConnection: jest.Mocked<TransactionalConnection>;
    let mockOrderService: jest.Mocked<OrderService>;
    let mockPaymentService: jest.Mocked<PaymentService>;
    let mockRequestContextService: jest.Mocked<RequestContextService>;
    let mockMetricsService: jest.Mocked<StripeSettlementMetricsService>;
    let mockLoggerService: jest.Mocked<StripeSettlementLoggerService>;
    let mockErrorHandlerService: jest.Mocked<StripeErrorHandlerService>;
    let mockOrderStateManager: jest.Mocked<StripeOrderStateManagerService>;
    let mockStripe: jest.Mocked<Stripe>;
    let mockTransactionalEntityManager: any;

    const mockPaymentIntentId = 'pi_test123';
    const mockOrderCode = 'ORDER-001';
    const mockOrderId = '1';
    const mockAmount = 1000; // $10.00
    const mockContext = { channel: 'default', req: {} };

    beforeEach(async () => {
        // Create comprehensive mocks
        mockConnection = {
            rawConnection: {
                transaction: jest.fn()
            },
            getRepository: jest.fn()
        } as any;

        mockOrderService = {
            findOneByCode: jest.fn()
        } as any;

        mockPaymentService = {
            addPaymentToOrder: jest.fn()
        } as any;

        mockRequestContextService = {
            create: jest.fn()
        } as any;

        mockMetricsService = {
            recordSettlementAttempt: jest.fn().mockReturnValue('attempt_123'),
            recordSettlementSuccess: jest.fn(),
            recordSettlementFailure: jest.fn(),
            recordApiVerificationAttempt: jest.fn(),
            recordApiVerificationSuccess: jest.fn(),
            recordApiVerificationFailure: jest.fn()
        } as any;

        mockLoggerService = {
            logSettlementAttemptStart: jest.fn(),
            logSettlementSuccess: jest.fn(),
            logSettlementFailure: jest.fn(),
            logApiVerificationAttempt: jest.fn(),
            logApiVerificationSuccess: jest.fn(),
            logApiVerificationFailure: jest.fn(),
            logPaymentIntentLifecycle: jest.fn(),
            logIdempotencyCheck: jest.fn(),
            logValidationFailure: jest.fn(),
            logDatabaseTransaction: jest.fn()
        } as any;

        mockErrorHandlerService = {
            categorizeError: jest.fn().mockReturnValue({
                category: 'unknown',
                adminMessage: 'Test error',
                userMessage: 'Payment failed',
                isRetryable: false
            })
        } as any;

        mockOrderStateManager = {
            handlePaymentFailure: jest.fn()
        } as any;

        mockTransactionalEntityManager = {
            findOne: jest.fn(),
            update: jest.fn()
        };

        // Mock Stripe
        mockStripe = {
            paymentIntents: {
                retrieve: jest.fn()
            }
        } as any;

        // Mock environment variable
        process.env.STRIPE_SECRET_KEY = 'sk_test_123';

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                StripeSettlementService,
                { provide: TransactionalConnection, useValue: mockConnection },
                { provide: OrderService, useValue: mockOrderService },
                { provide: PaymentService, useValue: mockPaymentService },
                { provide: RequestContextService, useValue: mockRequestContextService },
                { provide: StripeSettlementMetricsService, useValue: mockMetricsService },
                { provide: StripeSettlementLoggerService, useValue: mockLoggerService },
                { provide: StripeErrorHandlerService, useValue: mockErrorHandlerService },
                { provide: StripeOrderStateManagerService, useValue: mockOrderStateManager }
            ],
        }).compile();

        app = module.createNestApplication();
        await app.init();

        settlementService = module.get<StripeSettlementService>(StripeSettlementService);
        
        // Replace the Stripe instance with our mock
        (settlementService as any).stripe = mockStripe;
    });

    afterEach(async () => {
        await app.close();
        jest.clearAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
    });

    describe('Complete Payment Flow - Successful Payment', () => {
        const mockPendingPayment: PendingStripePayment = {
            id: 1,
            paymentIntentId: mockPaymentIntentId,
            orderId: mockOrderId,
            orderCode: mockOrderCode,
            amount: mockAmount,
            customerEmail: 'test@example.com',
            status: 'pending',
            createdAt: new Date(),
            settledAt: undefined
        };

        const mockPaymentIntent: Stripe.PaymentIntent = {
            id: mockPaymentIntentId,
            status: 'succeeded',
            amount: mockAmount,
            currency: 'usd',
            metadata: {
                vendure_order_code: mockOrderCode
            }
        } as any;

        const mockOrder = {
            id: mockOrderId,
            code: mockOrderCode,
            payments: []
        };

        beforeEach(() => {
            // Setup successful flow mocks
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            mockOrderService.findOneByCode.mockResolvedValue(mockOrder);
            mockRequestContextService.create.mockResolvedValue({} as any);
            mockPaymentService.addPaymentToOrder.mockResolvedValue({ 
                __typename: 'Order', 
                payments: [{ id: 'payment1' }] 
            } as Order);
        });

        it('should complete successful payment flow: PaymentIntent creation → linking → Stripe confirmation → API verification → settlement', async () => {
            // Execute the complete settlement flow
            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify successful result
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);
            expect(result.paymentId).toBe('payment1');

            // Verify complete flow execution
            // 1. Payment validation
            expect(mockTransactionalEntityManager.findOne).toHaveBeenCalledWith(
                PendingStripePayment,
                { where: { paymentIntentId: mockPaymentIntentId } }
            );

            // 2. Stripe API verification
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
                mockPaymentIntentId,
                { expand: ['charges.data.payment_method_details'] }
            );

            // 3. Order retrieval
            expect(mockOrderService.findOneByCode).toHaveBeenCalledWith(mockContext, mockOrderCode);

            // 4. Payment settlement
            expect(mockPaymentService.addPaymentToOrder).toHaveBeenCalledWith(
                expect.any(Object),
                mockOrderId,
                {
                    method: 'stripe',
                    metadata: {
                        paymentIntentId: mockPaymentIntentId,
                        stripePaymentStatus: 'succeeded',
                        stripeAmount: mockAmount,
                        stripeCurrency: 'usd'
                    }
                }
            );

            // 5. Database update
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'settled', settledAt: expect.any(Date) }
            );

            // Verify metrics and logging
            expect(mockMetricsService.recordSettlementAttempt).toHaveBeenCalledWith(mockPaymentIntentId, mockOrderCode);
            expect(mockMetricsService.recordApiVerificationAttempt).toHaveBeenCalledWith(mockPaymentIntentId);
            expect(mockMetricsService.recordApiVerificationSuccess).toHaveBeenCalled();
            expect(mockMetricsService.recordSettlementSuccess).toHaveBeenCalled();

            expect(mockLoggerService.logSettlementAttemptStart).toHaveBeenCalled();
            expect(mockLoggerService.logApiVerificationAttempt).toHaveBeenCalled();
            expect(mockLoggerService.logApiVerificationSuccess).toHaveBeenCalled();
            expect(mockLoggerService.logSettlementSuccess).toHaveBeenCalled();
            expect(mockLoggerService.logPaymentIntentLifecycle).toHaveBeenCalledWith(mockPaymentIntentId, 'settled', mockOrderCode);
        });

        it('should handle idempotency correctly for already settled payments', async () => {
            // Setup already settled payment
            const settledPayment = { ...mockPendingPayment, status: 'settled' };
            mockTransactionalEntityManager.findOne.mockResolvedValue(settledPayment);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify idempotent response
            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);

            // Verify no Stripe API call or database update for settled payment
            expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();
            expect(mockTransactionalEntityManager.update).not.toHaveBeenCalled();

            // Verify idempotency logging
            expect(mockLoggerService.logIdempotencyCheck).toHaveBeenCalledWith(
                mockPaymentIntentId, 
                mockOrderCode, 
                true, 
                'settled'
            );
            expect(mockMetricsService.recordSettlementSuccess).toHaveBeenCalled();
        });
    });

    describe('Failed Payment Scenarios', () => {
        const mockPendingPayment: PendingStripePayment = {
            id: 1,
            paymentIntentId: mockPaymentIntentId,
            orderId: mockOrderId,
            orderCode: mockOrderCode,
            amount: mockAmount,
            customerEmail: 'test@example.com',
            status: 'pending',
            createdAt: new Date(),
            settledAt: undefined
        };

        beforeEach(() => {
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });
            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
        });

        it('should ensure orders stay in ArrangingPayment when Stripe payment fails', async () => {
            // Setup failed PaymentIntent
            const failedPaymentIntent: Stripe.PaymentIntent = {
                id: mockPaymentIntentId,
                status: 'requires_payment_method',
                amount: mockAmount,
                currency: 'usd',
                metadata: { vendure_order_code: mockOrderCode }
            } as any;

            mockStripe.paymentIntents.retrieve.mockResolvedValue(failedPaymentIntent);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify failure result
            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment method required. Please complete the payment process.');

            // Verify payment marked as failed
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                expect.objectContaining({
                    status: 'failed',
                    failureReason: 'Test error',
                    isRetryable: false,
                    failedAt: expect.any(Date)
                })
            );

            // Verify order state management
            expect(mockOrderStateManager.handlePaymentFailure).toHaveBeenCalledWith(
                mockPaymentIntentId,
                expect.objectContaining({
                    paymentIntentId: mockPaymentIntentId,
                    orderCode: mockOrderCode,
                    failureReason: 'Test error',
                    isRetryable: false
                }),
                mockContext
            );

            // Verify failure metrics and logging
            expect(mockMetricsService.recordSettlementFailure).toHaveBeenCalled();
            expect(mockLoggerService.logSettlementFailure).toHaveBeenCalled();
        });

        it('should handle different Stripe payment failure statuses correctly', async () => {
            const failureScenarios = [
                { status: 'requires_confirmation', expectedMessage: 'Payment requires confirmation. Please complete the payment process.' },
                { status: 'requires_action', expectedMessage: 'Payment requires additional action. Please complete the payment process.' },
                { status: 'processing', expectedMessage: 'Payment is still processing. Please wait a moment and try again.' },
                { status: 'canceled', expectedMessage: 'Payment was canceled.' }
            ];

            for (const scenario of failureScenarios) {
                jest.clearAllMocks();
                mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);

                const failedPaymentIntent: Stripe.PaymentIntent = {
                    id: mockPaymentIntentId,
                    status: scenario.status as any,
                    amount: mockAmount,
                    currency: 'usd',
                    metadata: { vendure_order_code: mockOrderCode }
                } as any;

                mockStripe.paymentIntents.retrieve.mockResolvedValue(failedPaymentIntent);

                const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

                expect(result.success).toBe(false);
                expect(result.error).toBe(scenario.expectedMessage);
                expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                    PendingStripePayment,
                    { paymentIntentId: mockPaymentIntentId },
                    expect.objectContaining({ status: 'failed' })
                );
            }
        });
    });

    describe('API Failure Scenarios', () => {
        const mockPendingPayment: PendingStripePayment = {
            id: 1,
            paymentIntentId: mockPaymentIntentId,
            orderId: mockOrderId,
            orderCode: mockOrderCode,
            amount: mockAmount,
            customerEmail: 'test@example.com',
            status: 'pending',
            createdAt: new Date(),
            settledAt: undefined
        };

        beforeEach(() => {
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });
            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
        });

        it('should verify proper error handling and retry mechanisms for Stripe API failures', async () => {
            // Setup retryable Stripe error
            const stripeError = new Error('Connection timeout');
            (stripeError as any).type = 'StripeConnectionError';
            
            mockStripe.paymentIntents.retrieve
                .mockRejectedValueOnce(stripeError)
                .mockRejectedValueOnce(stripeError)
                .mockResolvedValueOnce({
                    id: mockPaymentIntentId,
                    status: 'succeeded',
                    amount: mockAmount,
                    currency: 'usd',
                    metadata: { vendure_order_code: mockOrderCode }
                } as any);

            // Setup successful order and payment service calls
            mockOrderService.findOneByCode.mockResolvedValue({
                id: mockOrderId,
                code: mockOrderCode,
                payments: []
            });
            mockRequestContextService.create.mockResolvedValue({} as any);
            mockPaymentService.addPaymentToOrder.mockResolvedValue({ 
                __typename: 'Order', 
                payments: [{ id: 'payment1' }] 
            } as Order);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify eventual success after retries
            expect(result.success).toBe(true);

            // Verify retry attempts were made
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(3);

            // Verify API verification metrics recorded failures and final success
            expect(mockMetricsService.recordApiVerificationAttempt).toHaveBeenCalled();
            expect(mockMetricsService.recordApiVerificationSuccess).toHaveBeenCalled();
        });

        it('should handle non-retryable Stripe API errors correctly', async () => {
            // Setup non-retryable Stripe error
            const stripeError = new Error('Invalid PaymentIntent ID');
            (stripeError as any).type = 'StripeInvalidRequestError';
            
            mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify failure without retries
            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment failed');

            // Verify only one API call was made (no retries)
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledTimes(1);

            // Verify failure metrics
            expect(mockMetricsService.recordApiVerificationFailure).toHaveBeenCalled();
            expect(mockLoggerService.logApiVerificationFailure).toHaveBeenCalled();
        });

        it('should handle database connection failures with proper error handling', async () => {
            // Setup database error
            const dbError = new Error('Database connection failed');
            mockTransactionalEntityManager.findOne.mockRejectedValue(dbError);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            // Verify failure
            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment settlement failed. Please try again.');

            // Verify failure metrics
            expect(mockMetricsService.recordSettlementFailure).toHaveBeenCalled();
            expect(mockLoggerService.logSettlementFailure).toHaveBeenCalled();
        });
    });

    describe('Concurrent Settlement Tests', () => {
        const mockPendingPayment: PendingStripePayment = {
            id: 1,
            paymentIntentId: mockPaymentIntentId,
            orderId: mockOrderId,
            orderCode: mockOrderCode,
            amount: mockAmount,
            customerEmail: 'test@example.com',
            status: 'pending',
            createdAt: new Date(),
            settledAt: undefined
        };

        const mockPaymentIntent: Stripe.PaymentIntent = {
            id: mockPaymentIntentId,
            status: 'succeeded',
            amount: mockAmount,
            currency: 'usd',
            metadata: { vendure_order_code: mockOrderCode }
        } as any;

        it('should ensure idempotency works correctly for concurrent settlements', async () => {
            // Setup mocks for concurrent scenario
            let callCount = 0;
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                callCount++;
                if (callCount === 1) {
                    // First call - payment is pending
                    mockTransactionalEntityManager.findOne.mockResolvedValueOnce(mockPendingPayment);
                } else {
                    // Subsequent calls - payment is already settled
                    mockTransactionalEntityManager.findOne.mockResolvedValueOnce({
                        ...mockPendingPayment,
                        status: 'settled'
                    });
                }
                return await callback(mockTransactionalEntityManager);
            });

            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            mockOrderService.findOneByCode.mockResolvedValue({
                id: mockOrderId,
                code: mockOrderCode,
                payments: []
            });
            mockRequestContextService.create.mockResolvedValue({} as any);
            mockPaymentService.addPaymentToOrder.mockResolvedValue({ 
                __typename: 'Order', 
                payments: [{ id: 'payment1' }] 
            } as Order);

            // Execute concurrent settlements
            const [result1, result2, result3] = await Promise.all([
                settlementService.settlePayment(mockPaymentIntentId, mockContext),
                settlementService.settlePayment(mockPaymentIntentId, mockContext),
                settlementService.settlePayment(mockPaymentIntentId, mockContext)
            ]);

            // All should succeed
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result3.success).toBe(true);

            // All should have same transaction ID
            expect(result1.transactionId).toBe(mockPaymentIntentId);
            expect(result2.transactionId).toBe(mockPaymentIntentId);
            expect(result3.transactionId).toBe(mockPaymentIntentId);

            // Verify idempotency checks were logged
            expect(mockLoggerService.logIdempotencyCheck).toHaveBeenCalled();
        });

        it('should handle race conditions in payment status updates', async () => {
            // Setup race condition scenario
            let updateCallCount = 0;
            mockTransactionalEntityManager.update.mockImplementation(async () => {
                updateCallCount++;
                if (updateCallCount === 1) {
                    // First update succeeds
                    return { affected: 1 };
                } else {
                    // Subsequent updates find no rows to update (already settled)
                    return { affected: 0 };
                }
            });

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            mockOrderService.findOneByCode.mockResolvedValue({
                id: mockOrderId,
                code: mockOrderCode,
                payments: []
            });
            mockRequestContextService.create.mockResolvedValue({} as any);
            mockPaymentService.addPaymentToOrder.mockResolvedValue({ 
                __typename: 'Order', 
                payments: [{ id: 'payment1' }] 
            } as Order);

            // Execute concurrent settlements
            const results = await Promise.all([
                settlementService.settlePayment(mockPaymentIntentId, mockContext),
                settlementService.settlePayment(mockPaymentIntentId, mockContext)
            ]);

            // Both should succeed due to idempotency
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(true);

            // Verify database transaction handling
            expect(mockLoggerService.logDatabaseTransaction).toHaveBeenCalledWith(
                mockPaymentIntentId, 
                mockOrderCode, 
                'start'
            );
            expect(mockLoggerService.logDatabaseTransaction).toHaveBeenCalledWith(
                mockPaymentIntentId, 
                mockOrderCode, 
                'commit', 
                'settlement successful'
            );
        });
    });

    describe('Edge Cases and Error Recovery', () => {
        it('should handle missing order metadata in PaymentIntent', async () => {
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: mockOrderId,
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const paymentIntentWithoutMetadata: Stripe.PaymentIntent = {
                id: mockPaymentIntentId,
                status: 'succeeded',
                amount: mockAmount,
                currency: 'usd',
                metadata: {} // Missing order code
            } as any;

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
            mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntentWithoutMetadata);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment failed');

            // Verify validation failure logging
            expect(mockLoggerService.logValidationFailure).toHaveBeenCalledWith(
                mockPaymentIntentId,
                mockOrderCode,
                'order',
                mockOrderCode,
                'missing'
            );
        });

        it('should handle amount mismatch between PaymentIntent and order', async () => {
            const mockPendingPayment: PendingStripePayment = {
                id: 1,
                paymentIntentId: mockPaymentIntentId,
                orderId: mockOrderId,
                orderCode: mockOrderCode,
                amount: mockAmount,
                customerEmail: 'test@example.com',
                status: 'pending',
                createdAt: new Date(),
                settledAt: undefined
            };

            const paymentIntentWithWrongAmount: Stripe.PaymentIntent = {
                id: mockPaymentIntentId,
                status: 'succeeded',
                amount: 2000, // Different amount
                currency: 'usd',
                metadata: { vendure_order_code: mockOrderCode }
            } as any;

            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
            mockStripe.paymentIntents.retrieve.mockResolvedValue(paymentIntentWithWrongAmount);

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment failed');

            // Verify amount validation failure logging
            expect(mockLoggerService.logValidationFailure).toHaveBeenCalledWith(
                mockPaymentIntentId,
                mockOrderCode,
                'amount',
                mockAmount,
                2000
            );
        });

        it('should handle Stripe service unavailable scenarios', async () => {
            // Test when Stripe is not initialized
            (settlementService as any).stripe = null;

            const result = await settlementService.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment processing service not available');

            // Verify no database operations were attempted
            expect(mockConnection.rawConnection.transaction).not.toHaveBeenCalled();
        });
    });
});