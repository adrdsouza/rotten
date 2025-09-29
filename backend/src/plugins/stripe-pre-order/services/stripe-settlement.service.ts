import {
    Logger,
    RequestContext,
    TransactionalConnection,
    OrderService,
    PaymentService,
    RequestContextService,
    Order,
} from '@vendure/core';
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';
import { ErrorHandlerService, RetryOptions } from '../../fulfillment-integration/services/error-handler.service';
import { StripeSettlementMetricsService } from './stripe-settlement-metrics.service';
import { StripeSettlementLoggerService } from './stripe-settlement-logger.service';
import { StripeErrorHandlerService } from './stripe-error-handler.service';
import { StripeOrderStateManagerService } from './stripe-order-state-manager.service';

export interface StripeSettlementResult {
    success: boolean;
    error?: string;
    paymentId?: string;
    transactionId?: string;
}

export interface StripePaymentValidation {
    isValid: boolean;
    error?: string;
    paymentIntent?: Stripe.PaymentIntent;
    pendingPayment?: PendingStripePayment;
}

export interface StripeApiClientOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
}

/**
 * Service responsible for settling Stripe payments with proper validation,
 * idempotency checks, error handling, and database transactions.
 */
@Injectable()
export class StripeSettlementService {
    private stripe: Stripe | null = null;
    private errorHandler: ErrorHandlerService;
    private readonly stripeApiRetryOptions: RetryOptions;

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private requestContextService: RequestContextService,
        private metricsService: StripeSettlementMetricsService,
        private settlementLogger: StripeSettlementLoggerService,
        private stripeErrorHandler: StripeErrorHandlerService,
        private orderStateManager: StripeOrderStateManagerService
    ) {
        this.errorHandler = new ErrorHandlerService();
        
        // Configure retry options specifically for Stripe API calls
        this.stripeApiRetryOptions = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 10000, // 10 seconds max
            backoffMultiplier: 2,
        };

        // Extend error handler to handle Stripe-specific errors
        this.enhanceErrorHandlerForStripe();
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
            Logger.info('StripeSettlementService initialized', 'StripeSettlementService');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, StripeSettlementService disabled', 'StripeSettlementService');
        }
    }

    /**
     * Settle a Stripe payment with comprehensive validation and error handling
     */
    async settlePayment(
        paymentIntentId: string,
        context: any
    ): Promise<StripeSettlementResult> {
        const startTime = Date.now();
        let attemptId: string | undefined;
        
        if (!this.stripe) {
            Logger.error(`[SETTLEMENT_SERVICE] Stripe not initialized for PaymentIntent ${paymentIntentId}`, 'StripeSettlementService');
            return {
                success: false,
                error: 'Payment processing service not available'
            };
        }

        Logger.info(`[SETTLEMENT_SERVICE] Starting settlement process for PaymentIntent: ${paymentIntentId}`, 'StripeSettlementService');

        // Use database transaction to ensure atomic operations
        return await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
            try {
                // Step 1: Validate payment and check idempotency
                const validation = await this.validatePaymentForSettlement(paymentIntentId, transactionalEntityManager);
                if (!validation.isValid) {
                    Logger.error(`[SETTLEMENT_SERVICE] Payment validation failed for ${paymentIntentId}: ${validation.error}`, 'StripeSettlementService');
                    
                    // Record failure metrics and logging
                    const duration = Date.now() - startTime;
                    if (attemptId) {
                        this.metricsService.recordSettlementFailure(attemptId, paymentIntentId, 'unknown', validation.error!, duration, 'validation');
                    }
                    this.settlementLogger.logValidationFailure(paymentIntentId, 'unknown', 'general', 'valid payment', validation.error, context);
                    
                    return {
                        success: false,
                        error: validation.error
                    };
                }

                const { paymentIntent, pendingPayment } = validation;
                const orderCode = pendingPayment!.orderCode;
                
                // Record settlement attempt start
                attemptId = this.metricsService.recordSettlementAttempt(paymentIntentId, orderCode);
                this.settlementLogger.logSettlementAttemptStart(
                    paymentIntentId, 
                    orderCode, 
                    pendingPayment!.amount, 
                    pendingPayment!.currency || 'USD',
                    context
                );
                this.settlementLogger.logDatabaseTransaction(paymentIntentId, orderCode, 'start');

                // Step 2: Check for idempotency - if already settled, return success
                this.settlementLogger.logIdempotencyCheck(paymentIntentId, orderCode, pendingPayment!.status === 'settled', pendingPayment!.status);
                
                if (pendingPayment!.status === 'settled') {
                    Logger.info(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntentId} already settled - idempotency check passed`, 'StripeSettlementService');
                    
                    // Record successful idempotency check
                    const duration = Date.now() - startTime;
                    this.metricsService.recordSettlementSuccess(attemptId!, paymentIntentId, orderCode, duration, 'existing');
                    
                    return {
                        success: true,
                        transactionId: paymentIntentId
                    };
                }

                // Step 3: Verify PaymentIntent with Stripe API
                const stripeValidation = await this.verifyPaymentIntentWithStripe(paymentIntentId, pendingPayment!);
                if (!stripeValidation.isValid) {
                    // Use enhanced error handling to categorize the error
                    const errorInfo = this.stripeErrorHandler.categorizeError(
                        new Error(stripeValidation.error || 'Stripe verification failed'), 
                        'stripe_verification'
                    );
                    
                    // Update payment status with detailed error information
                    await transactionalEntityManager.update(PendingStripePayment, 
                        { paymentIntentId }, 
                        { 
                            status: 'failed',
                            failureReason: errorInfo.adminMessage,
                            failureType: this.mapErrorCategoryToFailureType(errorInfo.category),
                            isRetryable: errorInfo.isRetryable,
                            failedAt: new Date()
                        }
                    );
                    
                    // Handle order state based on error type
                    await this.orderStateManager.handlePaymentFailure(paymentIntentId, {
                        paymentIntentId,
                        orderCode,
                        failureReason: errorInfo.adminMessage,
                        failureType: this.mapErrorCategoryToFailureType(errorInfo.category),
                        isRetryable: errorInfo.isRetryable,
                        timestamp: new Date()
                    }, context);
                    
                    Logger.error(`[SETTLEMENT_SERVICE] Stripe verification failed for ${paymentIntentId}: ${stripeValidation.error}`, 'StripeSettlementService');
                    
                    // Record failure metrics and logging
                    const duration = Date.now() - startTime;
                    this.metricsService.recordSettlementFailure(attemptId!, paymentIntentId, orderCode, stripeValidation.error!, duration, 'api');
                    this.settlementLogger.logSettlementFailure(paymentIntentId, orderCode, stripeValidation.error!, 'stripe', duration, context);
                    this.settlementLogger.logDatabaseTransaction(paymentIntentId, orderCode, 'rollback', 'stripe verification failed');
                    
                    return {
                        success: false,
                        error: errorInfo.userMessage // Return user-friendly message
                    };
                }

                // Step 4: Get order and create RequestContext
                const order = await this.orderService.findOneByCode(context, orderCode);
                if (!order) {
                    Logger.error(`[SETTLEMENT_SERVICE] Order not found: ${orderCode}`, 'StripeSettlementService');
                    
                    // Record failure metrics and logging
                    const duration = Date.now() - startTime;
                    this.metricsService.recordSettlementFailure(attemptId!, paymentIntentId, orderCode, 'Order not found', duration, 'database');
                    this.settlementLogger.logSettlementFailure(paymentIntentId, orderCode, 'Order not found', 'database', duration, context);
                    
                    return {
                        success: false,
                        error: 'Order not found'
                    };
                }

                const ctx = await this.createRequestContext(context);

                // Step 5: Add payment to order using Vendure's payment service
                Logger.info(`[SETTLEMENT_SERVICE] Adding payment to order ${order.code}`, 'StripeSettlementService');
                
                const paymentResult = await this.paymentService.addPaymentToOrder(ctx, order.id, {
                    method: 'stripe',
                    metadata: {
                        paymentIntentId: paymentIntentId,
                        stripePaymentStatus: paymentIntent!.status,
                        stripeAmount: paymentIntent!.amount,
                        stripeCurrency: paymentIntent!.currency
                    }
                });

                // Step 6: Handle payment result
                if (paymentResult.__typename === 'Order') {
                    // Settlement successful - update pending payment record
                    await transactionalEntityManager.update(PendingStripePayment, 
                        { paymentIntentId }, 
                        { 
                            status: 'settled',
                            settledAt: new Date()
                        }
                    );

                    Logger.info(`[SETTLEMENT_SERVICE] SUCCESS - Payment settled for order ${order.code} with PaymentIntent ${paymentIntentId}`, 'StripeSettlementService');
                    
                    // Record success metrics and logging
                    const duration = Date.now() - startTime;
                    const paymentId = (paymentResult as Order).payments?.[0]?.id;
                    this.metricsService.recordSettlementSuccess(attemptId!, paymentIntentId, orderCode, duration, paymentId);
                    this.settlementLogger.logSettlementSuccess(paymentIntentId, orderCode, paymentId || 'unknown', duration, stripeValidation.paymentIntent!.status, context);
                    this.settlementLogger.logDatabaseTransaction(paymentIntentId, orderCode, 'commit', 'settlement successful');
                    this.settlementLogger.logPaymentIntentLifecycle(paymentIntentId, 'settled', orderCode);
                    
                    return {
                        success: true,
                        paymentId,
                        transactionId: paymentIntentId
                    };
                } else {
                    // Settlement failed - update status and log error
                    await transactionalEntityManager.update(PendingStripePayment, 
                        { paymentIntentId }, 
                        { status: 'failed' }
                    );
                    
                    Logger.error(`[SETTLEMENT_SERVICE] Payment settlement failed for order ${order.code}: ${JSON.stringify(paymentResult)}`, 'StripeSettlementService');
                    
                    // Record failure metrics and logging
                    const duration = Date.now() - startTime;
                    const errorMessage = 'Payment settlement failed. Please contact support.';
                    this.metricsService.recordSettlementFailure(attemptId!, paymentIntentId, orderCode, errorMessage, duration, 'database');
                    this.settlementLogger.logSettlementFailure(paymentIntentId, orderCode, JSON.stringify(paymentResult), 'database', duration, context);
                    this.settlementLogger.logDatabaseTransaction(paymentIntentId, orderCode, 'rollback', 'payment settlement failed');
                    this.settlementLogger.logPaymentIntentLifecycle(paymentIntentId, 'failed', orderCode);
                    
                    return {
                        success: false,
                        error: errorMessage
                    };
                }

            } catch (error) {
                Logger.error(`[SETTLEMENT_SERVICE] FAILED - Unexpected error settling payment for PaymentIntent ${paymentIntentId}: ${error}`, 'StripeSettlementService');
                
                // Record failure metrics and logging
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : String(error);
                const orderCode = attemptId ? attemptId.split('_')[0] : 'unknown'; // Extract from attemptId if available
                
                if (attemptId) {
                    this.metricsService.recordSettlementFailure(attemptId, paymentIntentId, orderCode, errorMessage, duration, 'unknown');
                }
                this.settlementLogger.logSettlementFailure(paymentIntentId, orderCode, errorMessage, 'unknown', duration, context);
                this.settlementLogger.logDatabaseTransaction(paymentIntentId, orderCode, 'rollback', 'unexpected error');
                
                // Try to mark payment as failed if we have the record
                try {
                    await transactionalEntityManager.update(PendingStripePayment, 
                        { paymentIntentId }, 
                        { status: 'failed' }
                    );
                } catch (updateError) {
                    Logger.error(`[SETTLEMENT_SERVICE] Failed to update payment status to failed: ${updateError}`, 'StripeSettlementService');
                    this.settlementLogger.logSettlementFailure(paymentIntentId, orderCode, `Failed to update status: ${updateError}`, 'database', 0, context);
                }
                
                return {
                    success: false,
                    error: 'Payment settlement failed. Please try again.'
                };
            }
        });
    }

    /**
     * Validate payment for settlement with idempotency checks
     */
    private async validatePaymentForSettlement(
        paymentIntentId: string,
        transactionalEntityManager: any
    ): Promise<StripePaymentValidation> {
        // Find the pending payment record
        const pendingPayment = await transactionalEntityManager.findOne(PendingStripePayment, {
            where: { paymentIntentId }
        });

        if (!pendingPayment) {
            return {
                isValid: false,
                error: 'Payment not found'
            };
        }

        // Check if payment is in a failed state
        if (pendingPayment.status === 'failed') {
            return {
                isValid: false,
                error: 'Payment has failed and cannot be settled'
            };
        }

        return {
            isValid: true,
            pendingPayment
        };
    }

    /**
     * Verify PaymentIntent with Stripe API and validate against order data
     * Includes retry logic with exponential backoff for API failures
     */
    private async verifyPaymentIntentWithStripe(
        paymentIntentId: string,
        pendingPayment: PendingStripePayment
    ): Promise<StripePaymentValidation> {
        const startTime = Date.now();
        const orderCode = pendingPayment.orderCode;
        
        Logger.info(`[SETTLEMENT_SERVICE] Verifying PaymentIntent ${paymentIntentId} with Stripe API`, 'StripeSettlementService');
        
        // Record API verification attempt
        this.metricsService.recordApiVerificationAttempt(paymentIntentId);
        this.settlementLogger.logApiVerificationAttempt(paymentIntentId, orderCode);
        
        // Use retry logic for Stripe API call
        const result = await this.errorHandler.withRetry(
            async () => {
                return await this.retrievePaymentIntentFromStripe(paymentIntentId);
            },
            this.stripeApiRetryOptions,
            `Stripe PaymentIntent retrieval for ${paymentIntentId}`
        );

        if (!result.success) {
            const duration = Date.now() - startTime;
            Logger.error(`[SETTLEMENT_SERVICE] Failed to retrieve PaymentIntent ${paymentIntentId} after ${result.attempts} attempts: ${result.error?.message}`, 'StripeSettlementService');
            
            // Record API verification failure
            const errorMessage = result.error?.message || 'Unknown API error';
            this.metricsService.recordApiVerificationFailure(paymentIntentId, errorMessage, duration);
            
            // Categorize the error to provide better user feedback
            const errorInfo = this.errorHandler.categorizeError(result.error);
            let userMessage = 'Failed to verify payment with Stripe. Please try again.';
            let errorType = 'unknown';
            
            if (errorInfo.category === 'network') {
                userMessage = 'Network error while verifying payment. Please check your connection and try again.';
                errorType = 'network';
            } else if (errorInfo.category === 'server') {
                userMessage = 'Stripe service is temporarily unavailable. Please try again in a few moments.';
                errorType = 'server';
            }
            
            this.settlementLogger.logApiVerificationFailure(
                paymentIntentId, 
                orderCode, 
                errorMessage, 
                errorType, 
                duration, 
                result.attempts || 1, 
                false
            );
            
            return {
                isValid: false,
                error: userMessage
            };
        }

        const paymentIntent = result.result!;
        const duration = Date.now() - startTime;

        // Validate PaymentIntent status
        const statusValidation = this.validatePaymentIntentStatus(paymentIntent);
        if (!statusValidation.isValid) {
            this.metricsService.recordApiVerificationFailure(paymentIntentId, statusValidation.error!, duration);
            this.settlementLogger.logValidationFailure(paymentIntentId, orderCode, 'status', 'succeeded', paymentIntent.status);
            return statusValidation;
        }

        // Validate PaymentIntent belongs to the correct order
        const orderValidation = this.validatePaymentIntentOrder(paymentIntent, pendingPayment);
        if (!orderValidation.isValid) {
            this.metricsService.recordApiVerificationFailure(paymentIntentId, orderValidation.error!, duration);
            this.settlementLogger.logValidationFailure(
                paymentIntentId, 
                orderCode, 
                'order', 
                orderCode, 
                paymentIntent.metadata?.vendure_order_code || 'missing'
            );
            return orderValidation;
        }

        // Validate amount matches (allow 1 cent tolerance for rounding)
        const amountValidation = this.validatePaymentIntentAmount(paymentIntent, pendingPayment);
        if (!amountValidation.isValid) {
            this.metricsService.recordApiVerificationFailure(paymentIntentId, amountValidation.error!, duration);
            this.settlementLogger.logValidationFailure(
                paymentIntentId, 
                orderCode, 
                'amount', 
                pendingPayment.amount, 
                paymentIntent.amount
            );
            return amountValidation;
        }

        // Record successful API verification
        this.metricsService.recordApiVerificationSuccess(paymentIntentId, paymentIntent.status, duration);
        this.settlementLogger.logApiVerificationSuccess(
            paymentIntentId, 
            orderCode, 
            paymentIntent.status, 
            paymentIntent.amount, 
            paymentIntent.currency, 
            duration
        );

        Logger.info(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntentId} verified successfully with Stripe`, 'StripeSettlementService');
        
        return {
            isValid: true,
            paymentIntent
        };
    }

    /**
     * Retrieve PaymentIntent from Stripe API with proper error handling
     */
    private async retrievePaymentIntentFromStripe(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
        if (!this.stripe) {
            throw new Error('Stripe client not initialized');
        }

        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['charges.data.payment_method_details']
            });
            
            Logger.debug(`[SETTLEMENT_SERVICE] Successfully retrieved PaymentIntent ${paymentIntentId} from Stripe`, 'StripeSettlementService');
            return paymentIntent;
            
        } catch (error: any) {
            // Log the specific Stripe error for debugging
            Logger.error(`[SETTLEMENT_SERVICE] Stripe API error for PaymentIntent ${paymentIntentId}: ${error.message}`, 'StripeSettlementService');
            
            // Re-throw with additional context for retry logic
            if (error.type === 'StripeConnectionError' || error.type === 'StripeAPIError') {
                // These are typically retryable
                const retryableError = new Error(`Stripe API error: ${error.message}`);
                (retryableError as any).code = 'STRIPE_API_ERROR';
                (retryableError as any).isRetryable = true;
                throw retryableError;
            } else if (error.type === 'StripeInvalidRequestError') {
                // These are not retryable (invalid PaymentIntent ID, etc.)
                const nonRetryableError = new Error(`Invalid PaymentIntent: ${error.message}`);
                (nonRetryableError as any).code = 'STRIPE_INVALID_REQUEST';
                (nonRetryableError as any).isRetryable = false;
                throw nonRetryableError;
            } else {
                // Unknown error, treat as retryable
                throw error;
            }
        }
    }

    /**
     * Validate PaymentIntent status
     */
    private validatePaymentIntentStatus(paymentIntent: Stripe.PaymentIntent): StripePaymentValidation {
        if (paymentIntent.status !== 'succeeded') {
            Logger.warn(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntent.id} has invalid status: ${paymentIntent.status}`, 'StripeSettlementService');
            
            let errorMessage = `Payment not completed. Status: ${paymentIntent.status}`;
            
            // Provide more specific error messages based on status
            switch (paymentIntent.status) {
                case 'requires_payment_method':
                    errorMessage = 'Payment method required. Please complete the payment process.';
                    break;
                case 'requires_confirmation':
                    errorMessage = 'Payment requires confirmation. Please complete the payment process.';
                    break;
                case 'requires_action':
                    errorMessage = 'Payment requires additional action. Please complete the payment process.';
                    break;
                case 'processing':
                    errorMessage = 'Payment is still processing. Please wait a moment and try again.';
                    break;
                case 'requires_capture':
                    errorMessage = 'Payment requires capture. Please contact support.';
                    break;
                case 'canceled':
                    errorMessage = 'Payment was canceled.';
                    break;
                default:
                    errorMessage = `Payment status is ${paymentIntent.status}. Please contact support.`;
            }
            
            return {
                isValid: false,
                error: errorMessage
            };
        }

        return { isValid: true };
    }

    /**
     * Validate PaymentIntent belongs to the correct order
     */
    private validatePaymentIntentOrder(paymentIntent: Stripe.PaymentIntent, pendingPayment: PendingStripePayment): StripePaymentValidation {
        const orderCodeFromMetadata = paymentIntent.metadata?.vendure_order_code;
        
        if (!orderCodeFromMetadata) {
            Logger.error(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntent.id} missing order code in metadata`, 'StripeSettlementService');
            return {
                isValid: false,
                error: 'Payment is not properly linked to an order. Please contact support.'
            };
        }
        
        if (orderCodeFromMetadata !== pendingPayment.orderCode) {
            Logger.error(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntent.id} order mismatch - Expected: ${pendingPayment.orderCode}, Got: ${orderCodeFromMetadata}`, 'StripeSettlementService');
            return {
                isValid: false,
                error: 'Payment does not belong to the expected order. Please contact support.'
            };
        }

        return { isValid: true };
    }

    /**
     * Validate PaymentIntent amount matches expected amount
     */
    private validatePaymentIntentAmount(paymentIntent: Stripe.PaymentIntent, pendingPayment: PendingStripePayment): StripePaymentValidation {
        const expectedAmount = pendingPayment.amount;
        const actualAmount = paymentIntent.amount;
        const tolerance = 1; // Allow 1 cent tolerance for rounding
        
        if (Math.abs(expectedAmount - actualAmount) > tolerance) {
            Logger.error(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntent.id} amount mismatch - Expected: ${expectedAmount}, Actual: ${actualAmount}`, 'StripeSettlementService');
            return {
                isValid: false,
                error: `Payment amount (${actualAmount / 100}) does not match order total (${expectedAmount / 100}). Please contact support.`
            };
        }

        return { isValid: true };
    }

    /**
     * Create RequestContext for payment operations
     */
    private async createRequestContext(context: any): Promise<RequestContext> {
        return await this.requestContextService.create({
            apiType: 'shop',
            channelOrToken: context.channel || context.channelId,
            req: context.req
        });
    }

    /**
     * Check if a payment has already been settled (idempotency check)
     */
    async isPaymentSettled(paymentIntentId: string): Promise<boolean> {
        const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
            where: { paymentIntentId }
        });

        return pendingPayment?.status === 'settled';
    }

    /**
     * Get settlement status for a PaymentIntent
     */
    async getSettlementStatus(paymentIntentId: string): Promise<'pending' | 'settled' | 'failed' | 'not_found'> {
        const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
            where: { paymentIntentId }
        });

        if (!pendingPayment) {
            return 'not_found';
        }

        return pendingPayment.status;
    }

    /**
     * Verify PaymentIntent status with Stripe API (public method)
     * This method can be used to check PaymentIntent status without settling
     */
    async verifyPaymentIntentStatus(paymentIntentId: string): Promise<{
        isValid: boolean;
        status?: string;
        error?: string;
        paymentIntent?: Stripe.PaymentIntent;
    }> {
        if (!this.stripe) {
            Logger.error(`[SETTLEMENT_SERVICE] Stripe not initialized for PaymentIntent verification ${paymentIntentId}`, 'StripeSettlementService');
            return {
                isValid: false,
                error: 'Payment verification service not available'
            };
        }

        Logger.info(`[SETTLEMENT_SERVICE] Verifying PaymentIntent status: ${paymentIntentId}`, 'StripeSettlementService');

        // Use retry logic for Stripe API call
        const result = await this.errorHandler.withRetry(
            async () => {
                return await this.retrievePaymentIntentFromStripe(paymentIntentId);
            },
            this.stripeApiRetryOptions,
            `Stripe PaymentIntent status check for ${paymentIntentId}`
        );

        if (!result.success) {
            Logger.error(`[SETTLEMENT_SERVICE] Failed to verify PaymentIntent ${paymentIntentId} status after ${result.attempts} attempts: ${result.error?.message}`, 'StripeSettlementService');
            
            const errorInfo = this.errorHandler.categorizeError(result.error);
            let userMessage = 'Failed to verify payment status. Please try again.';
            
            if (errorInfo.category === 'network') {
                userMessage = 'Network error while checking payment status. Please check your connection and try again.';
            } else if (errorInfo.category === 'server') {
                userMessage = 'Payment verification service is temporarily unavailable. Please try again in a few moments.';
            }
            
            return {
                isValid: false,
                error: userMessage
            };
        }

        const paymentIntent = result.result!;
        
        Logger.info(`[SETTLEMENT_SERVICE] PaymentIntent ${paymentIntentId} status verified: ${paymentIntent.status}`, 'StripeSettlementService');
        
        return {
            isValid: true,
            status: paymentIntent.status,
            paymentIntent
        };
    }

    /**
     * Check if a PaymentIntent belongs to a specific order
     */
    async validatePaymentIntentOwnership(paymentIntentId: string, orderCode: string): Promise<{
        isValid: boolean;
        error?: string;
    }> {
        try {
            const statusResult = await this.verifyPaymentIntentStatus(paymentIntentId);
            
            if (!statusResult.isValid || !statusResult.paymentIntent) {
                return {
                    isValid: false,
                    error: statusResult.error || 'Failed to verify payment'
                };
            }

            const orderCodeFromMetadata = statusResult.paymentIntent.metadata?.vendure_order_code;
            
            if (!orderCodeFromMetadata) {
                return {
                    isValid: false,
                    error: 'Payment is not linked to any order'
                };
            }
            
            if (orderCodeFromMetadata !== orderCode) {
                return {
                    isValid: false,
                    error: 'Payment does not belong to the specified order'
                };
            }

            return { isValid: true };
            
        } catch (error) {
            Logger.error(`[SETTLEMENT_SERVICE] Error validating PaymentIntent ownership for ${paymentIntentId}: ${error}`, 'StripeSettlementService');
            return {
                isValid: false,
                error: 'Failed to validate payment ownership'
            };
        }
    }

    /**
     * Get detailed PaymentIntent information for debugging/admin purposes
     */
    async getPaymentIntentDetails(paymentIntentId: string): Promise<{
        success: boolean;
        paymentIntent?: Stripe.PaymentIntent;
        error?: string;
    }> {
        if (!this.stripe) {
            return {
                success: false,
                error: 'Stripe client not initialized'
            };
        }

        try {
            const result = await this.errorHandler.withRetry(
                async () => {
                    return await this.stripe!.paymentIntents.retrieve(paymentIntentId, {
                        expand: ['charges.data.payment_method_details', 'payment_method']
                    });
                },
                this.stripeApiRetryOptions,
                `Stripe PaymentIntent details retrieval for ${paymentIntentId}`
            );

            if (!result.success) {
                return {
                    success: false,
                    error: result.error?.message || 'Failed to retrieve payment details'
                };
            }

            return {
                success: true,
                paymentIntent: result.result
            };

        } catch (error) {
            Logger.error(`[SETTLEMENT_SERVICE] Error retrieving PaymentIntent details for ${paymentIntentId}: ${error}`, 'StripeSettlementService');
            return {
                success: false,
                error: 'Failed to retrieve payment details'
            };
        }
    }

    /**
     * Map error category to failure type for database storage
     */
    private mapErrorCategoryToFailureType(category: string): 'stripe_error' | 'validation_error' | 'system_error' | 'user_error' {
        switch (category) {
            case 'stripe':
                return 'stripe_error';
            case 'validation':
                return 'validation_error';
            case 'user':
                return 'user_error';
            case 'network':
            case 'system':
            default:
                return 'system_error';
        }
    }

    /**
     * Enhance the error handler to properly categorize Stripe-specific errors
     */
    private enhanceErrorHandlerForStripe(): void {
        const originalIsRetryableError = this.errorHandler.isRetryableError.bind(this.errorHandler);
        
        // Override the isRetryableError method to handle Stripe errors
        this.errorHandler.isRetryableError = (error: any): boolean => {
            // Handle Stripe-specific error types
            if (error.type) {
                switch (error.type) {
                    case 'StripeConnectionError':
                    case 'StripeAPIError':
                        return true; // Network/API errors are retryable
                    case 'StripeRateLimitError':
                        return true; // Rate limit errors are retryable
                    case 'StripeInvalidRequestError':
                        return false; // Invalid requests are not retryable
                    case 'StripeAuthenticationError':
                        return false; // Auth errors are not retryable
                    case 'StripePermissionError':
                        return false; // Permission errors are not retryable
                    case 'StripeCardError':
                        return false; // Card errors are not retryable
                    default:
                        // Unknown Stripe error, use original logic
                        break;
                }
            }

            // Handle custom error codes we set
            if (error.code === 'STRIPE_API_ERROR' && error.isRetryable !== undefined) {
                return error.isRetryable;
            }

            // Fall back to original error handling logic
            return originalIsRetryableError(error);
        };
    }
}