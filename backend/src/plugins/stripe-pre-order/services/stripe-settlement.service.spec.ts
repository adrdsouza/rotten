import { Test, TestingModule } from '@nestjs/testing';
import { StripeSettlementService } from './stripe-settlement.service';
import { TransactionalConnection, OrderService, PaymentService, RequestContextService } from '@vendure/core';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';
import { StripeSettlementMetricsService } from './stripe-settlement-metrics.service';
import { StripeSettlementLoggerService } from './stripe-settlement-logger.service';
import Stripe from 'stripe';

// Mock Stripe
jest.mock('stripe');

describe('StripeSettlementService', () => {
    let service: StripeSettlementService;
    let mockConnection: jest.Mocked<TransactionalConnection>;
    let mockOrderService: jest.Mocked<OrderService>;
    let mockPaymentService: jest.Mocked<PaymentService>;
    let mockRequestContextService: jest.Mocked<RequestContextService>;
    let mockMetricsService: jest.Mocked<StripeSettlementMetricsService>;
    let mockLoggerService: jest.Mocked<StripeSettlementLoggerService>;
    let mockStripe: jest.Mocked<Stripe>;
    let mockTransactionalEntityManager: any;

    const mockPaymentIntentId = 'pi_test123';
    const mockOrderCode = 'ORDER-001';
    const mockOrderId = '1';
    const mockAmount = 1000; // $10.00

    beforeEach(async () => {
        // Create mocks
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
                { provide: StripeSettlementLoggerService, useValue: mockLoggerService }
            ],
        }).compile();

        service = module.get<StripeSettlementService>(StripeSettlementService);
        
        // Replace the Stripe instance with our mock
        (service as any).stripe = mockStripe;
    });

    afterEach(() => {
        jest.clearAllMocks();
        delete process.env.STRIPE_SECRET_KEY;
    });

    describe('settlePayment', () => {
        const mockContext = { channel: 'default', req: {} };
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
            // Setup transaction mock
            mockConnection.rawConnection.transaction.mockImplementation(async (callback) => {
                return await callback(mockTransactionalEntityManager);
            });

            // Setup default successful mocks
            mockTransactionalEntityManager.findOne.mockResolvedValue(mockPendingPayment);
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);
            mockOrderService.findOneByCode.mockResolvedValue(mockOrder);
            mockRequestContextService.create.mockResolvedValue({} as any);
            mockPaymentService.addPaymentToOrder.mockResolvedValue({ __typename: 'Order', payments: [{ id: 'payment1' }] });
        });

        it('should successfully settle a valid payment', async () => {
            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'settled', settledAt: expect.any(Date) }
            );

            // Verify logging and metrics
            expect(mockMetricsService.recordSettlementAttempt).toHaveBeenCalledWith(mockPaymentIntentId, mockOrderCode);
            expect(mockLoggerService.logSettlementAttemptStart).toHaveBeenCalled();
            expect(mockMetricsService.recordSettlementSuccess).toHaveBeenCalled();
            expect(mockLoggerService.logSettlementSuccess).toHaveBeenCalled();
            expect(mockLoggerService.logPaymentIntentLifecycle).toHaveBeenCalledWith(mockPaymentIntentId, 'settled', mockOrderCode);
        });

        it('should return success for already settled payment (idempotency)', async () => {
            const settledPayment = { ...mockPendingPayment, status: 'settled' };
            mockTransactionalEntityManager.findOne.mockResolvedValue(settledPayment);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(true);
            expect(result.transactionId).toBe(mockPaymentIntentId);
            // Should not call Stripe API or update database for already settled payment
            expect(mockStripe.paymentIntents.retrieve).not.toHaveBeenCalled();

            // Verify idempotency logging
            expect(mockLoggerService.logIdempotencyCheck).toHaveBeenCalledWith(mockPaymentIntentId, mockOrderCode, true, 'settled');
            expect(mockMetricsService.recordSettlementSuccess).toHaveBeenCalled();
        });

        it('should fail when payment not found', async () => {
            mockTransactionalEntityManager.findOne.mockResolvedValue(null);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment not found');

            // Verify failure logging
            expect(mockLoggerService.logValidationFailure).toHaveBeenCalledWith(
                mockPaymentIntentId, 'unknown', 'general', 'valid payment', 'Payment not found', mockContext
            );
        });

        it('should fail when payment is already failed', async () => {
            const failedPayment = { ...mockPendingPayment, status: 'failed' };
            mockTransactionalEntityManager.findOne.mockResolvedValue(failedPayment);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment has failed and cannot be settled');
        });

        it('should fail when PaymentIntent status is not succeeded', async () => {
            const failedPaymentIntent = { ...mockPaymentIntent, status: 'requires_payment_method' };
            mockStripe.paymentIntents.retrieve.mockResolvedValue(failedPaymentIntent);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment not completed. Status: requires_payment_method');
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'failed' }
            );
        });

        it('should fail when order code mismatch', async () => {
            const mismatchedPaymentIntent = {
                ...mockPaymentIntent,
                metadata: { vendure_order_code: 'DIFFERENT-ORDER' }
            };
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mismatchedPaymentIntent);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment does not belong to the expected order');
        });

        it('should fail when amount mismatch', async () => {
            const mismatchedPaymentIntent = { ...mockPaymentIntent, amount: 2000 }; // Different amount
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mismatchedPaymentIntent);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment amount does not match order total');
        });

        it('should handle Stripe API errors', async () => {
            mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Stripe API error'));

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Failed to verify payment with Stripe. Please try again.');
        });

        it('should handle order not found', async () => {
            mockOrderService.findOneByCode.mockResolvedValue(null);

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Order not found');
        });

        it('should handle payment service failure', async () => {
            mockPaymentService.addPaymentToOrder.mockResolvedValue({
                __typename: 'PaymentFailedError',
                message: 'Payment failed'
            });

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment settlement failed. Please contact support.');
            expect(mockTransactionalEntityManager.update).toHaveBeenCalledWith(
                PendingStripePayment,
                { paymentIntentId: mockPaymentIntentId },
                { status: 'failed' }
            );
        });

        it('should handle unexpected errors and rollback transaction', async () => {
            mockOrderService.findOneByCode.mockRejectedValue(new Error('Unexpected database error'));

            const result = await service.settlePayment(mockPaymentIntentId, mockContext);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment settlement failed. Please try again.');
        });
    });

    describe('isPaymentSettled', () => {
        it('should return true for settled payment', async () => {
            const mockRepo = { findOne: jest.fn().mockResolvedValue({ status: 'settled' }) };
            mockConnection.getRepository.mockReturnValue(mockRepo as any);

            const result = await service.isPaymentSettled(mockPaymentIntentId);

            expect(result).toBe(true);
        });

        it('should return false for pending payment', async () => {
            const mockRepo = { findOne: jest.fn().mockResolvedValue({ status: 'pending' }) };
            mockConnection.getRepository.mockReturnValue(mockRepo as any);

            const result = await service.isPaymentSettled(mockPaymentIntentId);

            expect(result).toBe(false);
        });

        it('should return false for non-existent payment', async () => {
            const mockRepo = { findOne: jest.fn().mockResolvedValue(null) };
            mockConnection.getRepository.mockReturnValue(mockRepo as any);

            const result = await service.isPaymentSettled(mockPaymentIntentId);

            expect(result).toBe(false);
        });
    });

    describe('getSettlementStatus', () => {
        it('should return correct status for existing payment', async () => {
            const mockRepo = { findOne: jest.fn().mockResolvedValue({ status: 'settled' }) };
            mockConnection.getRepository.mockReturnValue(mockRepo as any);

            const result = await service.getSettlementStatus(mockPaymentIntentId);

            expect(result).toBe('settled');
        });

        it('should return not_found for non-existent payment', async () => {
            const mockRepo = { findOne: jest.fn().mockResolvedValue(null) };
            mockConnection.getRepository.mockReturnValue(mockRepo as any);

            const result = await service.getSettlementStatus(mockPaymentIntentId);

            expect(result).toBe('not_found');
        });
    });

    describe('initialization', () => {
        it('should initialize without Stripe when secret key is missing', () => {
            delete process.env.STRIPE_SECRET_KEY;
            
            const newService = new StripeSettlementService(
                mockConnection,
                mockOrderService,
                mockPaymentService,
                mockRequestContextService
            );

            expect((newService as any).stripe).toBeNull();
        });

        it('should fail settlement when Stripe is not initialized', async () => {
            delete process.env.STRIPE_SECRET_KEY;
            
            const newService = new StripeSettlementService(
                mockConnection,
                mockOrderService,
                mockPaymentService,
                mockRequestContextService
            );

            const result = await newService.settlePayment(mockPaymentIntentId, {});

            expect(result.success).toBe(false);
            expect(result.error).toBe('Payment processing service not available');
        });
    });

    describe('verifyPaymentIntentStatus', () => {
        const mockPaymentIntent: Stripe.PaymentIntent = {
            id: mockPaymentIntentId,
            status: 'succeeded',
            amount: mockAmount,
            currency: 'usd',
            metadata: {
                vendure_order_code: mockOrderCode
            }
        } as any;

        it('should successfully verify PaymentIntent status', async () => {
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

            const result = await service.verifyPaymentIntentStatus(mockPaymentIntentId);

            expect(result.isValid).toBe(true);
            expect(result.status).toBe('succeeded');
            expect(result.paymentIntent).toEqual(mockPaymentIntent);
        });

        it('should handle Stripe API errors with retry', async () => {
            const stripeError = new Error('Connection error');
            (stripeError as any).type = 'StripeConnectionError';
            mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError);

            const result = await service.verifyPaymentIntentStatus(mockPaymentIntentId);

            expect(result.isValid).toBe(false);
            expect(result.error).toContain('Network error while checking payment status');
        });

        it('should fail when Stripe is not initialized', async () => {
            (service as any).stripe = null;

            const result = await service.verifyPaymentIntentStatus(mockPaymentIntentId);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Payment verification service not available');
        });
    });

    describe('validatePaymentIntentOwnership', () => {
        const mockPaymentIntent: Stripe.PaymentIntent = {
            id: mockPaymentIntentId,
            status: 'succeeded',
            amount: mockAmount,
            currency: 'usd',
            metadata: {
                vendure_order_code: mockOrderCode
            }
        } as any;

        it('should validate ownership successfully', async () => {
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

            const result = await service.validatePaymentIntentOwnership(mockPaymentIntentId, mockOrderCode);

            expect(result.isValid).toBe(true);
        });

        it('should fail when order codes do not match', async () => {
            const mismatchedPaymentIntent = {
                ...mockPaymentIntent,
                metadata: { vendure_order_code: 'DIFFERENT-ORDER' }
            };
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mismatchedPaymentIntent);

            const result = await service.validatePaymentIntentOwnership(mockPaymentIntentId, mockOrderCode);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Payment does not belong to the specified order');
        });

        it('should fail when PaymentIntent has no order metadata', async () => {
            const noMetadataPaymentIntent = {
                ...mockPaymentIntent,
                metadata: {}
            };
            mockStripe.paymentIntents.retrieve.mockResolvedValue(noMetadataPaymentIntent);

            const result = await service.validatePaymentIntentOwnership(mockPaymentIntentId, mockOrderCode);

            expect(result.isValid).toBe(false);
            expect(result.error).toBe('Payment is not linked to any order');
        });
    });

    describe('getPaymentIntentDetails', () => {
        const mockPaymentIntent: Stripe.PaymentIntent = {
            id: mockPaymentIntentId,
            status: 'succeeded',
            amount: mockAmount,
            currency: 'usd',
            metadata: {
                vendure_order_code: mockOrderCode
            }
        } as any;

        it('should retrieve PaymentIntent details successfully', async () => {
            mockStripe.paymentIntents.retrieve.mockResolvedValue(mockPaymentIntent);

            const result = await service.getPaymentIntentDetails(mockPaymentIntentId);

            expect(result.success).toBe(true);
            expect(result.paymentIntent).toEqual(mockPaymentIntent);
            expect(mockStripe.paymentIntents.retrieve).toHaveBeenCalledWith(
                mockPaymentIntentId,
                { expand: ['charges.data.payment_method_details', 'payment_method'] }
            );
        });

        it('should handle Stripe API errors', async () => {
            const stripeError = new Error('PaymentIntent not found');
            mockStripe.paymentIntents.retrieve.mockRejectedValue(stripeError);

            const result = await service.getPaymentIntentDetails(mockPaymentIntentId);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to retrieve payment details');
        });

        it('should fail when Stripe is not initialized', async () => {
            (service as any).stripe = null;

            const result = await service.getPaymentIntentDetails(mockPaymentIntentId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Stripe client not initialized');
        });
    });

    describe('Stripe error handling', () => {
        it('should properly categorize StripeConnectionError as retryable', async () => {
            const connectionError = new Error('Connection failed');
            (connectionError as any).type = 'StripeConnectionError';
            
            const errorHandler = (service as any).errorHandler;
            const isRetryable = errorHandler.isRetryableError(connectionError);
            
            expect(isRetryable).toBe(true);
        });

        it('should properly categorize StripeInvalidRequestError as non-retryable', async () => {
            const invalidRequestError = new Error('Invalid PaymentIntent ID');
            (invalidRequestError as any).type = 'StripeInvalidRequestError';
            
            const errorHandler = (service as any).errorHandler;
            const isRetryable = errorHandler.isRetryableError(invalidRequestError);
            
            expect(isRetryable).toBe(false);
        });

        it('should properly categorize StripeRateLimitError as retryable', async () => {
            const rateLimitError = new Error('Rate limit exceeded');
            (rateLimitError as any).type = 'StripeRateLimitError';
            
            const errorHandler = (service as any).errorHandler;
            const isRetryable = errorHandler.isRetryableError(rateLimitError);
            
            expect(isRetryable).toBe(true);
        });

        it('should handle custom error codes', async () => {
            const customError = new Error('Custom Stripe error');
            (customError as any).code = 'STRIPE_API_ERROR';
            (customError as any).isRetryable = true;
            
            const errorHandler = (service as any).errorHandler;
            const isRetryable = errorHandler.isRetryableError(customError);
            
            expect(isRetryable).toBe(true);
        });
    });

    describe('PaymentIntent status validation', () => {
        it('should provide specific error messages for different PaymentIntent statuses', async () => {
            const testCases = [
                { status: 'requires_payment_method', expectedMessage: 'Payment method required. Please complete the payment process.' },
                { status: 'requires_confirmation', expectedMessage: 'Payment requires confirmation. Please complete the payment process.' },
                { status: 'requires_action', expectedMessage: 'Payment requires additional action. Please complete the payment process.' },
                { status: 'processing', expectedMessage: 'Payment is still processing. Please wait a moment and try again.' },
                { status: 'requires_capture', expectedMessage: 'Payment requires capture. Please contact support.' },
                { status: 'canceled', expectedMessage: 'Payment was canceled.' }
            ];

            for (const testCase of testCases) {
                const paymentIntent = {
                    id: mockPaymentIntentId,
                    status: testCase.status,
                    amount: mockAmount,
                    currency: 'usd',
                    metadata: { vendure_order_code: mockOrderCode }
                } as any;

                const validation = (service as any).validatePaymentIntentStatus(paymentIntent);
                
                expect(validation.isValid).toBe(false);
                expect(validation.error).toBe(testCase.expectedMessage);
            }
        });

        it('should pass validation for succeeded status', async () => {
            const paymentIntent = {
                id: mockPaymentIntentId,
                status: 'succeeded',
                amount: mockAmount,
                currency: 'usd',
                metadata: { vendure_order_code: mockOrderCode }
            } as any;

            const validation = (service as any).validatePaymentIntentStatus(paymentIntent);
            
            expect(validation.isValid).toBe(true);
        });
    });
});