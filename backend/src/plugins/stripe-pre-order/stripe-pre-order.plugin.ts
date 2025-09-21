import {
    VendurePlugin,
    PluginCommonModule,
    Logger,
    RequestContext,
    TransactionalConnection,
    OrderService,
    PaymentService,
    Payment,
    RequestContextService,
    PaymentMethodService,
    ChannelService,
    Order,
    LanguageCode,
    EntityManager,
} from '@vendure/core';
import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Args, Mutation, Query, Resolver, Context, ObjectType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import gql from 'graphql-tag';
import Stripe from 'stripe';
import { StripeApiService, PaymentIntentValidationResult } from './stripe-api.service';
import { StripePaymentMetricsService } from './stripe-payment-metrics.service';
import { StripeErrorHandlingService, StripeErrorResponse, RetryConfiguration } from './error-handling.service';
import { StripeAdminResolutionService, PaymentInvestigationReport, ManualSettlementResult, PaymentCancellationResult } from './admin-resolution.service';
import { StripeMonitoringService } from './stripe-monitoring.service';

/**
 * Settlement service for handling Stripe payment settlement with proper validation,
 * idempotency checks, error handling, and database transactions
 */
export class StripePaymentSettlementService {
    constructor(
        private stripe: Stripe,
        private stripeApiService: StripeApiService,
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private paymentMethodService: PaymentMethodService,
        private metricsService: StripePaymentMetricsService,
        private errorHandlingService: StripeErrorHandlingService
    ) { }

    /**
     * Main settlement method with comprehensive validation and transaction support
     */
    async settlePayment(
        paymentIntentId: string,
        ctx: RequestContext
    ): Promise<{ success: boolean; paymentId?: string; error?: string }> {
        const settlementStartTime = this.metricsService.logSettlementAttemptStart(paymentIntentId);

        let paymentIntent: any;
        let validationResult: any;

        try {
            Logger.info(`[SETTLEMENT_SERVICE] Starting settlement for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Input validation
            this.validatePaymentIntentId(paymentIntentId);

            // Step 1: Verify PaymentIntent status with Stripe API using enhanced service
            paymentIntent = await this.stripeApiService.retrievePaymentIntentWithRetry(paymentIntentId, {
                maxRetries: 3,
                baseDelayMs: 1000,
                maxDelayMs: 8000,
                jitterMs: 200
            });

            // Step 2: Comprehensive PaymentIntent validation using enhanced service
            validationResult = await this.stripeApiService.validatePaymentIntentForSettlement(paymentIntent);
            if (!validationResult.isValid) {
                const error = new Error(validationResult.error || 'PaymentIntent validation failed');
                // Add user-friendly message for frontend
                (error as any).userMessage = validationResult.userMessage;
                (error as any).errorCode = validationResult.errorCode;
                throw error;
            }

            const { orderCode, orderId, customerEmail } = validationResult;

            // Use database transaction to ensure atomic settlement operations
            const result = await this.connection.transaction(async (transactionalEntityManager) => {

                // Step 3: Idempotency check with database lock
                const existingPayment = await this.findExistingPaymentWithLock(
                    orderId, paymentIntentId, ctx, transactionalEntityManager
                );
                if (existingPayment) {
                    Logger.info(`[SETTLEMENT_SERVICE] Payment already exists (idempotent): ${existingPayment.id}`, 'StripePreOrderPlugin');
                    this.metricsService.logDuplicateSettlement(paymentIntentId, existingPayment.id, orderId);
                    return { success: true, paymentId: existingPayment.id };
                }

                // Step 4: Validate order state
                await this.validateOrderStateForSettlement(orderId, ctx, transactionalEntityManager);

                // Step 5: Create payment record
                const paymentId = await this.createPaymentRecordWithTransaction(
                    ctx, orderId, orderCode, paymentIntent, customerEmail, transactionalEntityManager
                );

                return { success: true, paymentId };
            });

            const settlementDuration = Date.now() - settlementStartTime;
            Logger.info(`[SETTLEMENT_SERVICE] Settlement completed successfully in ${settlementDuration}ms for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Log successful settlement metrics
            if (result.success && result.paymentId && validationResult) {
                this.metricsService.logSettlementSuccess(
                    paymentIntentId,
                    validationResult.orderId,
                    result.paymentId,
                    paymentIntent.amount,
                    paymentIntent.currency,
                    settlementStartTime
                );
            }

            return result;

        } catch (error) {
            const settlementDuration = Date.now() - settlementStartTime;
            Logger.error(`[SETTLEMENT_SERVICE] Settlement failed after ${settlementDuration}ms for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');

            // Create enhanced error response with user-friendly messages
            const errorResponse = this.errorHandlingService.createErrorResponse(
                error,
                paymentIntentId,
                'SETTLEMENT'
            );

            // Log settlement failure metrics with enhanced error information
            const errorInstance = error instanceof Error ? error : new Error(String(error));
            this.metricsService.logSettlementFailure(
                paymentIntentId, 
                errorInstance, 
                errorResponse.errorCode, 
                undefined, 
                settlementStartTime
            );

            return {
                success: false,
                error: errorResponse.userMessage,
                errorCode: errorResponse.errorCode,
                isRetryable: errorResponse.isRetryable,
                retryDelayMs: errorResponse.retryDelayMs,
                requiresUserAction: errorResponse.requiresUserAction,
                requiresPageRefresh: errorResponse.requiresPageRefresh
            };
        }
    }

    /**
     * Validate PaymentIntent ID format
     */
    private validatePaymentIntentId(paymentIntentId: string): void {
        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
            throw new Error('PaymentIntent ID is required and must be a string');
        }
        
        if (!paymentIntentId.startsWith('pi_')) {
            throw new Error('Invalid PaymentIntent ID format - must start with "pi_"');
        }
        
        if (paymentIntentId.length < 10) {
            throw new Error('Invalid PaymentIntent ID format - too short');
        }
    }

    /**
     * Check for existing payment with database lock (idempotency)
     */
    private async findExistingPaymentWithLock(
        orderId: string,
        paymentIntentId: string,
        ctx: RequestContext,
        transactionalEntityManager: EntityManager
    ): Promise<Payment | null> {
        try {
            // Use SELECT FOR UPDATE to prevent race conditions
            const order = await transactionalEntityManager
                .createQueryBuilder(Order, 'order')
                .leftJoinAndSelect('order.payments', 'payment')
                .where('order.id = :orderId', { orderId })
                .setLock('pessimistic_write')
                .getOne();

            if (!order) {
                throw new Error(`Order ${orderId} not found`);
            }

            // Look for existing payment with this PaymentIntent ID
            const existingPayment = order.payments?.find(payment =>
                payment.transactionId === paymentIntentId ||
                payment.metadata?.paymentIntentId === paymentIntentId
            );

            return existingPayment || null;
        } catch (error) {
            Logger.error(`[SETTLEMENT_SERVICE] Error checking for existing payment: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to check payment status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate order state before settlement
     */
    private async validateOrderStateForSettlement(
        orderId: string,
        ctx: RequestContext,
        transactionalEntityManager: EntityManager
    ): Promise<void> {
        const order = await transactionalEntityManager.findOne(Order, {
            where: { id: orderId },
            relations: ['payments']
        });

        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }

        // Check if order is in a valid state for payment settlement
        const validStatesForSettlement = ['ArrangingPayment', 'PaymentAuthorized'];
        if (!validStatesForSettlement.includes(order.state)) {
            throw new Error(`Order ${order.code} is in state '${order.state}' which cannot accept payment settlement`);
        }

        Logger.info(`[SETTLEMENT_SERVICE] Order ${order.code} validated for settlement (state: ${order.state})`, 'StripePreOrderPlugin');
    }

    /**
     * Create payment record within transaction
     */
    private async createPaymentRecordWithTransaction(
        ctx: RequestContext,
        orderId: string,
        orderCode: string,
        paymentIntent: Stripe.PaymentIntent,
        customerEmail: string,
        transactionalEntityManager: EntityManager
    ): Promise<string> {
        Logger.info(`[SETTLEMENT_SERVICE] Creating payment record for order ${orderCode}`, 'StripePreOrderPlugin');

        // Find the Stripe payment method
        const paymentMethod = await this.paymentMethodService.findAll(ctx);
        const stripeMethod = paymentMethod.items.find(method =>
            method.code === 'stripe-payment-intent' ||
            method.code === 'stripe' ||
            method.handler.code === 'stripe-payment-intent'
        );

        if (!stripeMethod) {
            throw new Error('Stripe payment method not configured');
        }

        // Prepare comprehensive payment metadata
        const paymentMetadata = {
            paymentIntentId: paymentIntent.id,
            stripePaymentMethodId: paymentIntent.payment_method as string,
            customerEmail: customerEmail,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            settlementTimestamp: new Date().toISOString(),
            source: 'stripe_pre_order_settlement',
            orderCode: orderCode,
            orderId: orderId,
            stripeChargeId: paymentIntent.latest_charge as string || null,
            paymentIntentStatus: paymentIntent.status,
            idempotencyKey: `${paymentIntent.id}_${orderId}_${Date.now()}`
        };

        // Create payment record
        const paymentResult = await this.paymentService.addPaymentToOrder(ctx, orderId, {
            method: stripeMethod.code,
            metadata: paymentMetadata
        });

        // Handle payment state transition errors
        if (paymentResult instanceof PaymentStateTransitionError) {
            Logger.error(`[SETTLEMENT_SERVICE] Payment state transition error: ${paymentResult.message}`, 'StripePreOrderPlugin');
            throw new Error(`Payment processing failed: ${paymentResult.message}`);
        }

        if (!paymentResult || typeof paymentResult !== 'object') {
            throw new Error('Payment creation returned invalid result');
        }

        Logger.info(`[SETTLEMENT_SERVICE] Successfully created payment record ${paymentResult.id}`, 'StripePreOrderPlugin');
        return paymentResult.id;
    }
}

/**
 * Entity to track PaymentIntents that are linked to orders but not yet settled
 */
@Entity()
export class PendingStripePayment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    paymentIntentId: string;

    @Column()
    orderId: string;

    @Column()
    orderCode: string;

    @Column()
    amount: number;

    @Column()
    customerEmail: string;

    @Column({ default: 'pending' })
    status: 'pending' | 'settled' | 'failed';

    @Column()
    createdAt: Date;

    @Column({ nullable: true })
    settledAt?: Date;
}

/**
 * GraphQL Types
 */

// Input Types
@InputType()
export class PreOrderCartItemInput {
    @Field()
    productVariantId: string;

    @Field()
    quantity: number;

    @Field()
    unitPrice: number;
}

// Output Types
@ObjectType()
export class PaymentIntentResult {
    @Field()
    clientSecret: string;

    @Field()
    paymentIntentId: string;

    @Field()
    amount: number;

    @Field()
    currency: string;
}

@ObjectType()
export class SettlementResult {
    @Field()
    success: boolean;

    @Field()
    orderId: string;

    @Field()
    orderCode: string;

    @Field(() => String, { nullable: true })
    paymentId?: string;

    @Field(() => String, { nullable: true })
    error?: string;
}

// Enum for payment status
enum PaymentStatus {
    PENDING = 'pending',
    SETTLED = 'settled',
    FAILED = 'failed',
    NOT_FOUND = 'not_found'
}

registerEnumType(PaymentStatus, {
    name: 'PaymentStatus',
    description: 'Status of a Stripe payment'
});

@ObjectType()
export class PaymentStatusResult {
    @Field(() => PaymentStatus)
    status: PaymentStatus;

    @Field()
    paymentIntentId: string;

    @Field({ nullable: true })
    orderCode?: string;

    @Field({ nullable: true })
    amount?: number;

    @Field({ nullable: true })
    createdAt?: Date;

    @Field({ nullable: true })
    settledAt?: Date;
}

/**
 * Enhanced GraphQL resolver with proper types and webhook security
 */
@Resolver()
export class StripePreOrderResolver {
    private stripe: Stripe | null = null;
    private stripeApiService: StripeApiService | null = null;
    private settlementService: StripePaymentSettlementService | null = null;
    private metricsService: StripePaymentMetricsService | null = null;
    private errorHandlingService: StripeErrorHandlingService | null = null;
    private adminResolutionService: StripeAdminResolutionService | null = null;
    private monitoringService: StripeMonitoringService | null = null;

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private requestContextService: RequestContextService,
        private paymentMethodService: PaymentMethodService,
        private channelService: ChannelService
    ) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });

            // Initialize metrics service
            this.metricsService = new StripePaymentMetricsService();

            // Initialize enhanced API service
            this.stripeApiService = new StripeApiService(this.stripe, this.metricsService);

            // Initialize error handling service
            this.errorHandlingService = new StripeErrorHandlingService(this.metricsService);

            // Initialize settlement service with enhanced services
            this.settlementService = new StripePaymentSettlementService(
                this.stripe,
                this.stripeApiService,
                this.connection,
                this.orderService,
                this.paymentService,
                this.paymentMethodService,
                this.metricsService,
                this.errorHandlingService
            );

            // Initialize admin resolution service
            this.adminResolutionService = new StripeAdminResolutionService(
                this.stripe,
                this.stripeApiService,
                this.connection,
                this.orderService,
                this.paymentService,
                this.metricsService,
                this.errorHandlingService
            );

            // Initialize monitoring service for background metrics and alerting
            this.monitoringService = new StripeMonitoringService(this.metricsService);

            Logger.info('Stripe Pre-Order Plugin initialized with enhanced API service, settlement service, and monitoring', 'StripePreOrderPlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, Stripe Pre-Order Plugin disabled', 'StripePreOrderPlugin');
        }
    }

    /**
     * Create a PaymentIntent before order creation - returns detailed result
     */
    @Mutation(() => PaymentIntentResult)
    async createPreOrderStripePaymentIntent(
        @Args('estimatedTotal') estimatedTotal: number,
        @Args('currency', { defaultValue: 'usd' }) currency: string
    ): Promise<PaymentIntentResult> {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`Creating pre-order PaymentIntent for estimated total: ${estimatedTotal}`, 'StripePreOrderPlugin');

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: estimatedTotal,
                currency: currency,
                // BEST PRACTICE: Add idempotency key based on session/cart
                // idempotency_key: `pre_order_${sessionId}_${Date.now()}`,
                metadata: {
                    source: 'pre_order_validation',
                    created_at: new Date().toISOString(),
                    estimated_total: estimatedTotal.toString()
                }
            });

            Logger.info(`Pre-order PaymentIntent created: ${paymentIntent.id}`, 'StripePreOrderPlugin');
<<<<<<< HEAD

            // Log PaymentIntent creation metrics
            if (this.metricsService) {
                this.metricsService.logPaymentIntentCreated(paymentIntent.id, estimatedTotal, currency);
            }

            return paymentIntent.client_secret as string;
=======
            
            return {
                clientSecret: paymentIntent.client_secret as string,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            };
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920

        } catch (error) {
            Logger.error(`Failed to create pre-order PaymentIntent: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to initialize payment. Please try again.');
        }
    }

    /**
<<<<<<< HEAD
     * Update PaymentIntent amount and link it to a created Vendure order
     * FIXED: Only updates PaymentIntent metadata - NO immediate settlement
=======
     * Link PaymentIntent to order - NO settlement, returns boolean success
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
     */
    @Mutation(() => Boolean)
    async linkPaymentIntentToOrder(
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('orderId') orderId: string,
        @Args('orderCode') orderCode: string,
        @Args('finalTotal') finalTotal: number,
        @Args('customerEmail', { nullable: true }) customerEmail?: string
    ): Promise<boolean> {
<<<<<<< HEAD
        // Debug logging to see what arguments we're receiving
        Logger.info(`[RESOLVER] linkPaymentIntentToOrder called with args: ${JSON.stringify({
            paymentIntentId,
            orderCode,
            finalTotal,
            customerEmail,
            types: {
                paymentIntentId: typeof paymentIntentId,
                orderId: typeof orderId,
                orderCode: typeof orderCode,
                finalTotal: typeof finalTotal,
                customerEmail: typeof customerEmail
            }
        })}`, 'StripePreOrderPlugin');

=======
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
<<<<<<< HEAD
            Logger.info(`[LINK] Linking PaymentIntent ${paymentIntentId} to order ${orderCode} (ID: ${orderId}, Total: ${finalTotal}, Email: ${customerEmail || 'guest'}) - METADATA ONLY, NO SETTLEMENT`, 'StripePreOrderPlugin');

            // Update PaymentIntent with final order details - METADATA ONLY
            const updateParams = {
                amount: finalTotal, // Update to final order total
=======
            Logger.info(`Linking PaymentIntent ${paymentIntentId} to order ${orderCode}`, 'StripePreOrderPlugin');

            // 1. Update PaymentIntent with final order details
            await this.stripe.paymentIntents.update(paymentIntentId, {
                amount: finalTotal,
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
                metadata: {
                    vendure_order_code: orderCode,
                    vendure_order_id: orderId,
                    vendure_customer_email: customerEmail || 'guest',
                    source: 'order_linked',
                    final_total: finalTotal.toString(),
                    linked_at: new Date().toISOString()
                }
            });

<<<<<<< HEAD
            Logger.info(`[STRIPE API] Updating PaymentIntent ${paymentIntentId} with params: ${JSON.stringify(updateParams)}`, 'StripePreOrderPlugin');

            const updatedPaymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, updateParams);

            Logger.info(`[STRIPE API] PaymentIntent updated successfully. New metadata: ${JSON.stringify(updatedPaymentIntent.metadata)}`, 'StripePreOrderPlugin');

            // Log PaymentIntent linking metrics
            if (this.metricsService) {
                this.metricsService.logPaymentIntentLinked(
                    paymentIntentId,
                    orderId,
                    orderCode,
                    finalTotal,
                    customerEmail || 'guest'
                );
            }

            // REMOVED: No longer calling createPaymentRecord/addPaymentToOrder here
            // Payment settlement will be handled by separate settlement endpoint after Stripe confirmation

            Logger.info(`[LINK] Successfully linked PaymentIntent ${paymentIntentId} to order ${orderCode} - READY FOR SETTLEMENT`, 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`[LINK] Failed to link PaymentIntent to order: ${error}`, 'StripePreOrderPlugin');
            Logger.error(`[LINK] Error details: ${JSON.stringify({
                paymentIntentId,
                orderId,
                orderCode,
                finalTotal,
                customerEmail,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            })}`, 'StripePreOrderPlugin');
=======
            // 2. Store pending payment (NO Vendure Payment record yet)
            await this.connection.getRepository(PendingStripePayment).save({
                paymentIntentId,
                orderId,
                orderCode,
                amount: finalTotal,
                customerEmail: customerEmail || 'guest',
                status: 'pending',
                createdAt: new Date()
            });

            Logger.info(`PaymentIntent ${paymentIntentId} linked to order ${orderCode} - awaiting confirmation`, 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`Failed to link PaymentIntent to order: ${error}`, 'StripePreOrderPlugin');
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
            throw new Error('Failed to finalize payment setup. Please try again.');
        }
    }

    /**
<<<<<<< HEAD
     * Settle a Stripe payment after verifying PaymentIntent status with Stripe API
     * This endpoint should be called by the frontend after Stripe confirms the payment
     * Uses the enhanced settlement service with proper validation, idempotency, error handling, and database transactions
     */
    @Mutation(() => Boolean)
    async settleStripePayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Context() ctx: RequestContext
    ): Promise<boolean> {
        if (!this.settlementService) {
            throw new Error('Settlement service is not initialized');
        }

        Logger.info(`[RESOLVER] Settlement request received for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

        try {
            const result = await this.settlementService.settlePayment(paymentIntentId, ctx);

            if (result.success) {
                Logger.info(`[RESOLVER] Settlement successful for PaymentIntent ${paymentIntentId}, payment ID: ${result.paymentId}`, 'StripePreOrderPlugin');
                return true;
            } else {
                Logger.error(`[RESOLVER] Settlement failed for PaymentIntent ${paymentIntentId}: ${result.error}`, 'StripePreOrderPlugin');
                throw new Error(result.error || 'Payment settlement failed');
            }
        } catch (error) {
            Logger.error(`[RESOLVER] Settlement error for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');

            if (!this.errorHandlingService) {
                throw new Error('Error handling service not initialized');
            }

            // Create enhanced error response with retry information
            const errorResponse = this.errorHandlingService.createErrorResponse(
                error,
                paymentIntentId,
                'SETTLEMENT_RESOLVER'
            );

            // For duplicate payments, return success instead of error
            if (errorResponse.isSuccess) {
                Logger.info(`[RESOLVER] Duplicate payment detected for PaymentIntent ${paymentIntentId}, returning success`, 'StripePreOrderPlugin');
                return true;
            }

            // Create enhanced error with additional metadata for frontend
            const enhancedError = new Error(errorResponse.userMessage);
            (enhancedError as any).errorCode = errorResponse.errorCode;
            (enhancedError as any).isRetryable = errorResponse.isRetryable;
            (enhancedError as any).retryDelayMs = errorResponse.retryDelayMs;
            (enhancedError as any).requiresUserAction = errorResponse.requiresUserAction;
            (enhancedError as any).requiresPageRefresh = errorResponse.requiresPageRefresh;

            throw enhancedError;
        }
    }





    /**
     * Get the Stripe payment method configuration
     */
    private async getStripePaymentMethod(ctx: RequestContext) {
        try {
            const paymentMethods = await this.paymentMethodService.findAll(ctx);
            const stripeMethod = paymentMethods.items.find(method =>
                method.code === 'stripe-payment-intent' ||
                method.code === 'stripe' ||
                method.handler.code === 'stripe-payment-intent'
            );

            if (!stripeMethod) {
                Logger.error('[PAYMENT] No Stripe payment method found. Available methods: ' +
                    paymentMethods.items.map(m => `${m.code} (${m.handler.code})`).join(', '), 'StripePreOrderPlugin');
                throw new Error('Stripe payment method not configured');
            }

            Logger.info(`[PAYMENT] Found Stripe payment method: ${stripeMethod.code}`, 'StripePreOrderPlugin');
            return stripeMethod;
        } catch (error) {
            Logger.error(`[PAYMENT] Error finding Stripe payment method: ${error}`, 'StripePreOrderPlugin');
            throw error;
=======
     * Settle payment after Stripe confirmation - returns detailed result
     */
    @Mutation(() => SettlementResult)
    async settleStripePayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Context() ctx: RequestContext
    ): Promise<SettlementResult> {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`Starting settlement for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            // 1. BEST PRACTICE: Verify with Stripe API first
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
                return {
                    success: false,
                    orderId: '',
                    orderCode: '',
                    error: `Payment not completed. Status: ${paymentIntent.status}`
                };
            }

            // 2. Get pending payment record
            const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
                where: { paymentIntentId, status: 'pending' }
            });

            if (!pendingPayment) {
                return {
                    success: false,
                    orderId: '',
                    orderCode: '',
                    error: 'No pending payment found for this PaymentIntent'
                };
            }

            // 3. Verify amounts match (security best practice)
            if (paymentIntent.amount_received !== pendingPayment.amount) {
                Logger.error(`Amount mismatch: PaymentIntent(${paymentIntent.amount_received}) vs Pending(${pendingPayment.amount})`);
                throw new Error('Payment amount verification failed');
            }

            // 4. Create Vendure Payment record (triggers settlement)
            const payment = await this.createPaymentRecord(
                paymentIntentId,
                pendingPayment.orderId,
                pendingPayment.orderCode,
                paymentIntent.amount_received || paymentIntent.amount
            );

            // 5. Mark as settled
            await this.connection.getRepository(PendingStripePayment).update(
                { id: pendingPayment.id },
                { 
                    status: 'settled',
                    settledAt: new Date()
                }
            );

            Logger.info(`Payment ${paymentIntentId} settled successfully`, 'StripePreOrderPlugin');
            
            return {
                success: true,
                orderId: pendingPayment.orderId,
                orderCode: pendingPayment.orderCode,
                paymentId: payment?.id ? String(payment.id) : undefined
            };

        } catch (error) {
            Logger.error(`Settlement failed: ${error}`, 'StripePreOrderPlugin');
            
            // Mark as failed
            try {
                await this.connection.getRepository(PendingStripePayment).update(
                    { paymentIntentId, status: 'pending' },
                    { status: 'failed' }
                );
            } catch (updateError) {
                Logger.error(`Failed to update payment status: ${updateError}`, 'StripePreOrderPlugin');
            }
            
            return {
                success: false,
                orderId: '',
                orderCode: '',
                error: 'Payment settlement failed. Please contact support if payment was deducted.'
            };
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
        }
    }

    /**
     * Enhanced payment status query with full details
     */
    @Query(() => PaymentStatusResult)
    async getPaymentStatus(
        @Args('paymentIntentId') paymentIntentId: string
    ): Promise<PaymentStatusResult> {
        const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
            where: { paymentIntentId }
        });

        if (!pendingPayment) {
            return {
                status: PaymentStatus.NOT_FOUND,
                paymentIntentId
            };
        }

        return {
            status: pendingPayment.status as PaymentStatus,
            paymentIntentId,
            orderCode: pendingPayment.orderCode,
            amount: pendingPayment.amount,
            createdAt: pendingPayment.createdAt,
            settledAt: pendingPayment.settledAt
        };
    }

    /**
     * Calculate estimated total with proper typing
     */
    @Query(() => Number)
    async calculateEstimatedTotal(
        @Args('cartItems', { type: () => [PreOrderCartItemInput] }) cartItems: PreOrderCartItemInput[]
    ): Promise<number> {
        try {
            const subtotal = cartItems.reduce((total, item) => {
                return total + (item.unitPrice * item.quantity);
            }, 0);

            const estimatedTotal = Math.round(subtotal * 1.1);
            Logger.info(`Calculated estimated total: ${estimatedTotal} from ${cartItems.length} items`, 'StripePreOrderPlugin');
            return estimatedTotal;

        } catch (error) {
            Logger.error(`Failed to calculate estimated total: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to calculate order total');
        }
    }

<<<<<<< HEAD
    /**
     * Get PaymentIntent status information for debugging and validation
     */
    @Query(() => String)
    async getPaymentIntentStatus(
        @Args('paymentIntentId') paymentIntentId: string
    ): Promise<string> {
        if (!this.stripeApiService) {
            throw new Error('Stripe API service is not initialized');
        }

        try {
            Logger.info(`Getting status for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            const paymentIntent = await this.stripeApiService.retrievePaymentIntentWithRetry(paymentIntentId);
            const statusInfo = this.stripeApiService.getPaymentIntentStatusInfo(paymentIntent.status);

            const result = {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                canSettle: statusInfo.canSettle,
                isTerminal: statusInfo.isTerminal,
                description: statusInfo.description,
                userMessage: statusInfo.userMessage,
                metadata: paymentIntent.metadata
            };

            Logger.info(`PaymentIntent ${paymentIntentId} status: ${JSON.stringify(result)}`, 'StripePreOrderPlugin');
            return JSON.stringify(result, null, 2);

        } catch (error) {
            Logger.error(`Failed to get PaymentIntent status: ${error}`, 'StripePreOrderPlugin');
            
            if (!this.errorHandlingService) {
                throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : String(error)}`);
            }

            const errorResponse = this.errorHandlingService.createErrorResponse(
                error,
                paymentIntentId,
                'STATUS_CHECK'
            );

            throw new Error(errorResponse.userMessage);
        }
    }

    /**
     * Admin endpoint: Investigate payment issues
     */
    @Query(() => String)
    async investigatePayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Context() ctx: RequestContext
    ): Promise<string> {
        if (!this.adminResolutionService) {
            throw new Error('Admin resolution service is not initialized');
        }

        try {
            Logger.info(`[ADMIN] Investigation requested for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            const investigation = await this.adminResolutionService.investigatePayment(paymentIntentId, ctx);
            return JSON.stringify(investigation, null, 2);

        } catch (error) {
            Logger.error(`[ADMIN] Investigation failed for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Investigation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Manually settle a payment
     */
    @Mutation(() => String)
    async manuallySettlePayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('adminUserId') adminUserId: string,
        @Args('reason') reason: string,
        @Args('forceSettle', { defaultValue: false }) forceSettle: boolean,
        @Context() ctx: RequestContext
    ): Promise<string> {
        if (!this.adminResolutionService) {
            throw new Error('Admin resolution service is not initialized');
        }

        try {
            Logger.info(`[ADMIN] Manual settlement requested by ${adminUserId} for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            const result = await this.adminResolutionService.manuallySettlePayment(
                paymentIntentId,
                ctx,
                adminUserId,
                reason,
                forceSettle
            );

            return JSON.stringify(result, null, 2);

        } catch (error) {
            Logger.error(`[ADMIN] Manual settlement failed for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Manual settlement failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Get comprehensive metrics summary
     */
    @Query(() => String)
    async getStripePaymentMetrics(): Promise<string> {
        if (!this.metricsService) {
            throw new Error('Metrics service is not initialized');
        }

        try {
            Logger.info('[ADMIN] Metrics summary requested', 'StripePreOrderPlugin');

            const summary = this.metricsService.getMetricsSummary();
            
            // Also log the summary to console for monitoring
            this.metricsService.logMetricsSummary();
            
            return JSON.stringify(summary, null, 2);

        } catch (error) {
            Logger.error(`[ADMIN] Failed to get metrics summary: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to get metrics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Reset metrics (useful for testing or periodic resets)
     */
    @Mutation(() => Boolean)
    async resetStripePaymentMetrics(): Promise<boolean> {
        if (!this.metricsService) {
            throw new Error('Metrics service is not initialized');
        }

        try {
            Logger.info('[ADMIN] Metrics reset requested', 'StripePreOrderPlugin');

            this.metricsService.resetMetrics();
            
            // Also clear monitoring alert cooldowns
            if (this.monitoringService) {
                this.monitoringService.clearAlertCooldowns();
            }
            
            Logger.info('[ADMIN] Metrics reset completed', 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`[ADMIN] Failed to reset metrics: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to reset metrics: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Get monitoring service status
     */
    @Query(() => String)
    async getStripeMonitoringStatus(): Promise<string> {
        if (!this.monitoringService) {
            throw new Error('Monitoring service is not initialized');
        }

        try {
            Logger.info('[ADMIN] Monitoring status requested', 'StripePreOrderPlugin');

            const status = this.monitoringService.getMonitoringStatus();
            return JSON.stringify(status, null, 2);

        } catch (error) {
            Logger.error(`[ADMIN] Failed to get monitoring status: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to get monitoring status: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Force metrics report (useful for testing)
     */
    @Mutation(() => Boolean)
    async forceStripeMetricsReport(): Promise<boolean> {
        if (!this.monitoringService) {
            throw new Error('Monitoring service is not initialized');
        }

        try {
            Logger.info('[ADMIN] Force metrics report requested', 'StripePreOrderPlugin');

            this.monitoringService.forceMetricsReport();
            
            Logger.info('[ADMIN] Force metrics report completed', 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`[ADMIN] Failed to force metrics report: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to force metrics report: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Enable/disable alerting
     */
    @Mutation(() => Boolean)
    async setStripeAlertingEnabled(
        @Args('enabled') enabled: boolean
    ): Promise<boolean> {
        if (!this.monitoringService) {
            throw new Error('Monitoring service is not initialized');
        }

        try {
            Logger.info(`[ADMIN] Setting alerting enabled: ${enabled}`, 'StripePreOrderPlugin');

            this.monitoringService.setAlertingEnabled(enabled);
            
            Logger.info(`[ADMIN] Alerting ${enabled ? 'enabled' : 'disabled'}`, 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`[ADMIN] Failed to set alerting: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to set alerting: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Admin endpoint: Cancel a stuck payment
     */
    @Mutation(() => String)
    async cancelStuckPayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('adminUserId') adminUserId: string,
        @Args('reason') reason: string,
        @Context() ctx: RequestContext
    ): Promise<string> {
        if (!this.adminResolutionService) {
            throw new Error('Admin resolution service is not initialized');
        }

        try {
            Logger.info(`[ADMIN] Payment cancellation requested by ${adminUserId} for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            const result = await this.adminResolutionService.cancelStuckPayment(
                paymentIntentId,
                ctx,
                adminUserId,
                reason
            );

            return JSON.stringify(result, null, 2);

        } catch (error) {
            Logger.error(`[ADMIN] Payment cancellation failed for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');
            throw new Error(`Payment cancellation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
=======
    // Private helper methods remain the same...
    private async createPaymentRecord(
        paymentIntentId: string,
        orderId: string,
        orderCode: string,
        amount: number
    ): Promise<Payment | null> {
        const outerCtx = await this.createContext('default-channel', 'en');
        
        return await this.connection.withTransaction(outerCtx, async (ctx) => {
            const order = await this.orderService.findOneByCode(ctx, orderCode);
            if (!order) {
                throw new Error(`Unable to find order ${orderCode}`);
            }

            if (order.state !== 'ArrangingPayment') {
                const transitionResult = await this.orderService.transitionToState(ctx, parseInt(orderId, 10), 'ArrangingPayment');
                if (transitionResult && 'errorCode' in transitionResult) {
                    throw new Error(`Failed to prepare order: ${transitionResult.message}`);
                }
            }

            const paymentMethod = await this.getPaymentMethod(ctx);
            const result = await this.orderService.addPaymentToOrder(ctx, parseInt(orderId, 10), {
                method: paymentMethod.code,
                metadata: {
                    paymentIntentAmountReceived: amount,
                    paymentIntentId: paymentIntentId,
                },
            });

            if (!(result instanceof Order)) {
                throw new Error(`Failed to add payment: ${(result as any).message}`);
            }

            Logger.info(`Payment record created for ${paymentIntentId}`, 'StripePreOrderPlugin');
            return result.payments?.[result.payments.length - 1] || null;
        });
    }

    private async createContext(channelToken: string, languageCode: string): Promise<RequestContext> {
        return this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: channelToken,
            languageCode: languageCode as LanguageCode,
        });
    }

    private async getPaymentMethod(ctx: RequestContext) {
        const method = (await this.paymentMethodService.findAll(ctx)).items.find(m => m.handler.code === 'stripe');
        if (!method) {
            throw new Error('Could not find Stripe PaymentMethod');
        }
        return method;
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
    }
}

/**
 * Enhanced webhook controller with proper security
 */
@Controller('stripe-preorder-webhook')
export class StripePreOrderWebhookController {
<<<<<<< HEAD
    constructor(private connection: TransactionalConnection) { }
=======
    private stripe: Stripe | null = null;

    constructor(private connection: TransactionalConnection) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
        }
    }
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('stripe-signature') signature: string,
        @Res() res: Response
    ) {
        if (!this.stripe) {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).send('Stripe not initialized');
            return;
        }

        const webhookSecret = process.env.STRIPE_PREORDER_WEBHOOK_SECRET;
        if (!webhookSecret) {
            Logger.error('STRIPE_PREORDER_WEBHOOK_SECRET not configured', 'StripePreOrderWebhook');
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Webhook not configured');
            return;
        }

        try {
            // BEST PRACTICE: Verify webhook signature
            const event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
            
            Logger.info(`Processing webhook event: ${event.type}`, 'StripePreOrderWebhook');

            // Handle relevant events for monitoring/logging
            switch (event.type) {
                case 'payment_intent.succeeded':
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    Logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`, 'StripePreOrderWebhook');
                    break;
                case 'payment_intent.payment_failed':
                    const failedPayment = event.data.object as Stripe.PaymentIntent;
                    Logger.warn(`PaymentIntent failed: ${failedPayment.id}`, 'StripePreOrderWebhook');
                    break;
                default:
                    Logger.debug(`Unhandled webhook event: ${event.type}`, 'StripePreOrderWebhook');
            }

            res.status(HttpStatus.OK).send('OK');
        } catch (error) {
            Logger.error(`Webhook verification failed: ${error}`, 'StripePreOrderWebhook');
            res.status(HttpStatus.BAD_REQUEST).send('Invalid signature');
        }
    }
}

/**
 * Complete plugin with all types and best practices
 */
@VendurePlugin({
    imports: [PluginCommonModule],
<<<<<<< HEAD
    providers: [
        StripePreOrderPlugin, 
        StripePreOrderResolver, 
        StripeApiService, 
        StripePaymentMetricsService,
        StripeErrorHandlingService,
        StripeAdminResolutionService,
        StripeMonitoringService
    ],
=======
    providers: [StripePreOrderResolver],
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
    controllers: [StripePreOrderWebhookController],
    entities: [PendingStripePayment],
    shopApiExtensions: {
        resolvers: [StripePreOrderResolver],
        schema: gql`
            extend type Mutation {
                createPreOrderStripePaymentIntent(estimatedTotal: Int!, currency: String = "usd"): PaymentIntentResult!
                linkPaymentIntentToOrder(paymentIntentId: String!, orderId: String!, orderCode: String!, finalTotal: Int!, customerEmail: String): Boolean!
<<<<<<< HEAD
                settleStripePayment(paymentIntentId: String!): Boolean!
                
                # Admin endpoints for manual payment resolution
                manuallySettlePayment(paymentIntentId: String!, adminUserId: String!, reason: String!, forceSettle: Boolean = false): String!
                cancelStuckPayment(paymentIntentId: String!, adminUserId: String!, reason: String!): String!
                
                # Admin endpoints for metrics management
                resetStripePaymentMetrics: Boolean!
                forceStripeMetricsReport: Boolean!
                setStripeAlertingEnabled(enabled: Boolean!): Boolean!
=======
                settleStripePayment(paymentIntentId: String!): SettlementResult!
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
            }

            extend type Query {
                calculateEstimatedTotal(cartItems: [PreOrderCartItemInput!]!): Int!
<<<<<<< HEAD
                getPaymentIntentStatus(paymentIntentId: String!): String!
                
                # Admin endpoints for payment investigation
                investigatePayment(paymentIntentId: String!): String!
                
                # Admin endpoints for metrics and monitoring
                getStripePaymentMetrics: String!
                getStripeMonitoringStatus: String!
=======
                getPaymentStatus(paymentIntentId: String!): PaymentStatusResult!
            }

            type PaymentIntentResult {
                clientSecret: String!
                paymentIntentId: String!
                amount: Int!
                currency: String!
            }

            type SettlementResult {
                success: Boolean!
                orderId: String!
                orderCode: String!
                paymentId: String
                error: String
            }

            type PaymentStatusResult {
                status: PaymentStatus!
                paymentIntentId: String!
                orderCode: String
                amount: Int
                createdAt: DateTime
                settledAt: DateTime
            }

            enum PaymentStatus {
                PENDING
                SETTLED
                FAILED
                NOT_FOUND
>>>>>>> 5a1e37c1313ea95d1a27f726d7a0aad98764c920
            }

            input PreOrderCartItemInput {
                productVariantId: String!
                quantity: Int!
                unitPrice: Int!
            }
        `
    },
    compatibility: '^3.0.0',
})
export class StripePreOrderPlugin {
    static instance: StripePreOrderPlugin;

    constructor() {
        StripePreOrderPlugin.instance = this;
    }

    async onApplicationBootstrap() {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            Logger.info('Stripe Pre-Order Plugin with enhanced security initialized', 'StripePreOrderPlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, plugin disabled', 'StripePreOrderPlugin');
        }
    }
}