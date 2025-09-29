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
    PaymentMethodHandler,
    CreatePaymentResult,
    SettlePaymentResult,
    CreateRefundResult,
} from '@vendure/core';
import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Args, Mutation, Query, Resolver, Context, ObjectType, Field, InputType, registerEnumType } from '@nestjs/graphql';
import gql from 'graphql-tag';
import Stripe from 'stripe';
import { PendingStripePayment } from './entities/pending-stripe-payment.entity';
import { StripeSettlementService } from './services/stripe-settlement.service';
import { StripeErrorHandlerService } from './services/stripe-error-handler.service';
import { StripeOrderStateManagerService } from './services/stripe-order-state-manager.service';
import { StripeAdminToolsService } from './services/stripe-admin-tools.service';
import { StripeAdminResolver } from './resolvers/stripe-admin.resolver';
import { stripeAdminSchema } from './schema/stripe-admin.schema';

/**
 * GraphQL Types
 */
@InputType()
export class PreOrderCartItemInput {
    @Field()
    productVariantId: string;

    @Field()
    quantity: number;

    @Field()
    unitPrice: number;
}

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

    @Field({ nullable: true })
    orderId?: string;

    @Field({ nullable: true })
    orderCode?: string;

    @Field({ nullable: true })
    paymentId?: string;

    @Field({ nullable: true })
    error?: string;
}

/**
 * Stripe Pre-Order Payment Method Handler
 * Handles standard addPaymentToOrder calls for linked PaymentIntents
 */
export const stripePreOrderPaymentHandler = new PaymentMethodHandler({
    code: 'stripe',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Stripe Payment'
        }
    ],
    args: {},

    /** Called when a payment is added to an order */
    createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
        try {
            Logger.info(`[SETTLE_PAYMENT] SETTLEMENT INITIATED - Order: ${order.code}, Amount: ${amount}`, 'StripePreOrderPlugin');
            Logger.info(`[SETTLE_PAYMENT] Received metadata: ${JSON.stringify(metadata)}`, 'StripePreOrderPlugin');

            // Extract PaymentIntent ID from metadata
            // Handle both direct string and object with paymentIntentId property
            let paymentIntentId: string;
            
            if (typeof metadata === 'string') {
                paymentIntentId = metadata;
            } else if (metadata && typeof metadata === 'object' && metadata.paymentIntentId) {
                paymentIntentId = metadata.paymentIntentId;
            } else {
                Logger.error(`[SETTLE_PAYMENT] No PaymentIntent ID provided in metadata: ${JSON.stringify(metadata)}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Error' as any,
                    errorMessage: 'PaymentIntent ID is required',
                };
            }

            if (!paymentIntentId || typeof paymentIntentId !== 'string') {
                Logger.error(`[SETTLE_PAYMENT] Invalid PaymentIntent ID: ${paymentIntentId}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: 'PaymentIntent ID must be a valid string',
                };
            }

            Logger.info(`[SETTLE_PAYMENT] Processing PaymentIntent for settlement: ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Initialize Stripe
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                Logger.error(`[SETTLE_PAYMENT] Stripe secret key not configured`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: 'Payment processing not available',
                };
            }

            const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-08-16' });

            // Verify PaymentIntent with Stripe
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
                expand: ['charges.data.payment_method_details']
            });

            if (paymentIntent.status !== 'succeeded') {
                Logger.error(`[SETTLE_PAYMENT] PaymentIntent ${paymentIntentId} not succeeded: ${paymentIntent.status}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: `Payment not completed. Status: ${paymentIntent.status}`,
                };
            }

            // Verify amount matches (convert to cents for comparison)
            const expectedAmountInCents = Math.round(amount);
            const actualAmountInCents = paymentIntent.amount;

            if (Math.abs(expectedAmountInCents - actualAmountInCents) > 1) { // Allow 1 cent tolerance
                Logger.error(`[SETTLE_PAYMENT] Amount mismatch - Expected: ${expectedAmountInCents}, Actual: ${actualAmountInCents}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: 'Payment amount does not match order total',
                };
            }

            Logger.info(`[SETTLE_PAYMENT] Payment verified successfully for ${paymentIntentId}`, 'StripePreOrderPlugin');
            Logger.info(`[SETTLE_PAYMENT] SUCCESS - Payment settled for order ${order.code} with PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Return successful payment result
            return {
                amount: actualAmountInCents,
                state: 'Settled' as any,
                transactionId: paymentIntentId,
                metadata: {
                    stripePaymentIntentId: paymentIntentId,
                    stripePaymentStatus: paymentIntent.status,
                    stripeAmount: actualAmountInCents,
                    stripeCurrency: paymentIntent.currency,
                    public: {
                         paymentMethod: 'Stripe',
                         transactionId: paymentIntentId,
                     }
                },
            };

        } catch (error) {
            Logger.error(`[SETTLE_PAYMENT] FAILED - Error processing payment settlement: ${error}`, 'StripePreOrderPlugin');
            return {
                amount,
                state: 'Declined' as any,
                errorMessage: 'Payment processing failed. Please try again.',
            };
        }
    },

    /** Called when a payment needs to be settled (usually automatic for Stripe) */
    settlePayment: async (ctx, order, payment): Promise<SettlePaymentResult> => {
        // For Stripe, payments are already settled when created
        return { success: true };
    },

    /** Called when a refund is requested */
    createRefund: async (ctx, input, amount, order, payment): Promise<CreateRefundResult> => {
        try {
            const paymentIntentId = payment.transactionId;
            if (!paymentIntentId) {
                return {
                    state: 'Failed' as any,
                };
            }

            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                return {
                    state: 'Failed' as any,
                };
            }

            const stripe = new Stripe(stripeSecretKey, { apiVersion: '2023-08-16' });

            // Create refund in Stripe
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                amount: amount,
                reason: 'requested_by_customer',
            });

            return {
                state: 'Settled' as any,
                transactionId: refund.id,
            };

        } catch (error) {
            Logger.error(`[STRIPE_HANDLER] Error creating refund: ${error}`, 'StripePreOrderPlugin');
            return {
                state: 'Failed' as any,
            };
        }
    },
});

/**
 * GraphQL resolver for Stripe pre-order operations
 */
@Resolver()
export class StripePreOrderResolver {
    private stripe: Stripe | null = null;

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private requestContextService: RequestContextService,
        private paymentMethodService: PaymentMethodService,
        private channelService: ChannelService,
        private stripeSettlementService: StripeSettlementService
    ) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
            Logger.info('Stripe Pre-Order Plugin initialized', 'StripePreOrderPlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, Stripe Pre-Order Plugin disabled', 'StripePreOrderPlugin');
        }
    }

    /**
     * Create a PaymentIntent before order creation
     */
    @Mutation(() => PaymentIntentResult)
    async createPreOrderStripePaymentIntent(
        @Args('estimatedTotal') estimatedTotal: number,
        @Args('currency', { defaultValue: 'usd' }) currency: string
    ): Promise<PaymentIntentResult> {
        Logger.info(`[STRIPE_RESOLVER] createPreOrderStripePaymentIntent called with estimatedTotal: ${estimatedTotal}, currency: ${currency}`, 'StripePreOrderPlugin');

        if (!this.stripe) {
            Logger.error('[STRIPE_RESOLVER] Stripe is not initialized - check STRIPE_SECRET_KEY environment variable', 'StripePreOrderPlugin');
            throw new Error('Stripe is not initialized - check STRIPE_SECRET_KEY environment variable');
        }

        try {
            Logger.info(`[STRIPE_RESOLVER] Creating pre-order PaymentIntent for estimated total: ${estimatedTotal}`, 'StripePreOrderPlugin');

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: estimatedTotal,
                currency: currency,
                automatic_payment_methods: {
                    enabled: true, // 🎯 This enables Apple Pay, Google Pay, and other payment methods!
                },
                metadata: {
                    source: 'pre_order_validation',
                    created_at: new Date().toISOString(),
                    estimated_total: estimatedTotal.toString()
                }
            });

            Logger.info(`Pre-order PaymentIntent created: ${paymentIntent.id}`, 'StripePreOrderPlugin');

            return {
                clientSecret: paymentIntent.client_secret as string,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            };

        } catch (error) {
            Logger.error(`[STRIPE_RESOLVER] Failed to create pre-order PaymentIntent: ${error}`, 'StripePreOrderPlugin');
            Logger.error(`[STRIPE_RESOLVER] Error details: ${JSON.stringify(error)}`, 'StripePreOrderPlugin');
            throw new Error(`Failed to initialize payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Link PaymentIntent to order - NO settlement, returns boolean success
     * This function ONLY links the PaymentIntent to the order without settling payment
     */
    @Mutation(() => Boolean)
    async linkPaymentIntentToOrder(
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('orderId') orderId: string,
        @Args('orderCode') orderCode: string,
        @Args('finalTotal') finalTotal: number,
        @Args('customerEmail', { nullable: true }) customerEmail?: string
    ): Promise<boolean> {
        if (!this.stripe) {
            Logger.error(`[LINK_PAYMENT] Stripe not initialized for PaymentIntent ${paymentIntentId}`, 'StripePreOrderPlugin');
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`[LINK_PAYMENT] Starting link process - PaymentIntent: ${paymentIntentId}, Order: ${orderCode}, Amount: ${finalTotal}`, 'StripePreOrderPlugin');

            // Update PaymentIntent with final order details (metadata only)
            await this.stripe.paymentIntents.update(paymentIntentId, {
                amount: finalTotal,
                metadata: {
                    vendure_order_code: orderCode,
                    vendure_order_id: orderId,
                    vendure_customer_email: customerEmail || 'guest',
                    source: 'order_linked',
                    final_total: finalTotal.toString(),
                    linked_at: new Date().toISOString()
                }
            });

            Logger.info(`[LINK_PAYMENT] PaymentIntent metadata updated successfully for ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Store pending payment record (NO Vendure Payment record created yet)
            const pendingPayment = await this.connection.getRepository(PendingStripePayment).save({
                paymentIntentId,
                orderId,
                orderCode,
                amount: finalTotal,
                customerEmail: customerEmail || 'guest',
                status: 'pending',
                createdAt: new Date()
            });

            Logger.info(`[LINK_PAYMENT] SUCCESS - PaymentIntent ${paymentIntentId} linked to order ${orderCode}`, 'StripePreOrderPlugin');
            Logger.info(`[LINK_PAYMENT] Pending payment record created with ID: ${pendingPayment.id}`, 'StripePreOrderPlugin');
            Logger.info(`[LINK_PAYMENT] IMPORTANT: Payment is LINKED but NOT SETTLED - awaiting frontend confirmation and settlement`, 'StripePreOrderPlugin');
            
            return true;

        } catch (error) {
            Logger.error(`[LINK_PAYMENT] FAILED to link PaymentIntent ${paymentIntentId} to order ${orderCode}: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to finalize payment setup. Please try again.');
        }
    }

    /**
     * Settle a Stripe payment after frontend confirmation
     * This mutation uses the StripeSettlementService for proper validation and error handling
     */
    @Mutation(() => SettlementResult)
    async settleStripePayment(
        @Args('paymentIntentId') paymentIntentId: string,
        @Context() context: any
    ): Promise<SettlementResult> {
        Logger.info(`[SETTLE_STRIPE_PAYMENT] Settlement requested for PaymentIntent: ${paymentIntentId}`, 'StripePreOrderPlugin');

        try {
            const result = await this.stripeSettlementService.settlePayment(paymentIntentId, context);
            
            if (result.success) {
                Logger.info(`[SETTLE_STRIPE_PAYMENT] SUCCESS - Payment settled with transaction ID: ${result.transactionId}`, 'StripePreOrderPlugin');
                
                // Get order information from the settlement result
                const orderInfo = await this.getOrderInfoFromPaymentIntent(paymentIntentId, context);
                
                return {
                    success: true,
                    orderId: orderInfo?.orderId,
                    orderCode: orderInfo?.orderCode,
                    paymentId: result.paymentId
                };
            } else {
                Logger.error(`[SETTLE_STRIPE_PAYMENT] FAILED - ${result.error}`, 'StripePreOrderPlugin');
                return {
                    success: false,
                    error: result.error || 'Payment settlement failed'
                };
            }
        } catch (error) {
            Logger.error(`[SETTLE_STRIPE_PAYMENT] FAILED - Error in settlement process: ${error}`, 'StripePreOrderPlugin');
            
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Payment settlement failed. Please try again.'
            };
        }
    }

    /**
     * Helper method to get order information from PaymentIntent metadata
     */
    private async getOrderInfoFromPaymentIntent(paymentIntentId: string, context: any): Promise<{ orderId?: string; orderCode?: string } | null> {
        try {
            const pendingPayment = await this.connection.getRepository(context, PendingStripePayment)
                .findOne({ where: { paymentIntentId } });
            
            if (pendingPayment) {
                return {
                    orderId: pendingPayment.orderId,
                    orderCode: pendingPayment.orderCode
                };
            }
            
            return null;
        } catch (error) {
            Logger.error(`[GET_ORDER_INFO] Failed to get order info for PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrderPlugin');
            return null;
        }
    }

    /**
     * Calculate estimated total for cart items
     */
    @Query(() => Number)
    async calculateEstimatedTotal(
        @Args('cartItems', { type: () => [PreOrderCartItemInput] }) cartItems: PreOrderCartItemInput[]
    ): Promise<number> {
        const subtotal = cartItems.reduce((total, item) => {
            return total + (item.unitPrice * item.quantity);
        }, 0);

        // Add estimated tax/shipping (10% estimation)
        const estimatedTotal = Math.round(subtotal * 1.1);
        return Math.max(estimatedTotal, 100); // Minimum $1.00
    }
}

/**
 * Webhook controller for Stripe events
 */
@Controller('stripe-preorder-webhook')
export class StripePreOrderWebhookController {
    constructor(private connection: TransactionalConnection) { }

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('stripe-signature') signature: string,
        @Res() res: Response
    ) {
        // Webhook handling logic can be added here if needed
        res.status(HttpStatus.OK).send('OK');
    }
}

/**
 * Complete plugin with PaymentMethodHandler
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        StripePreOrderResolver, 
        StripeSettlementService,
        StripeErrorHandlerService,
        StripeOrderStateManagerService,
        StripeAdminToolsService,
        StripeAdminResolver
    ],
    controllers: [StripePreOrderWebhookController],
    entities: [PendingStripePayment],
    adminApiExtensions: {
        resolvers: [StripeAdminResolver],
        schema: stripeAdminSchema
    },
    shopApiExtensions: {
        resolvers: [StripePreOrderResolver],
        schema: gql`
            extend type Mutation {
                createPreOrderStripePaymentIntent(estimatedTotal: Int!, currency: String = "usd"): PaymentIntentResult!
                linkPaymentIntentToOrder(paymentIntentId: String!, orderId: String!, orderCode: String!, finalTotal: Int!, customerEmail: String): Boolean!
                settleStripePayment(paymentIntentId: String!): SettlementResult!
            }

            extend type Query {
                calculateEstimatedTotal(cartItems: [PreOrderCartItemInput!]!): Int!
            }

            type PaymentIntentResult {
                clientSecret: String!
                paymentIntentId: String!
                amount: Int!
                currency: String!
            }

            type SettlementResult {
                success: Boolean!
                orderId: String
                orderCode: String
                paymentId: String
                error: String
            }

            input PreOrderCartItemInput {
                productVariantId: String!
                quantity: Int!
                unitPrice: Int!
            }
        `
    },
    compatibility: '^3.0.0',
    configuration: config => {
        // Add the Stripe Pre-Order payment handler
        Logger.info('Registering stripe-pre-order payment method handler.', 'StripePreOrderPlugin');
        config.paymentOptions.paymentMethodHandlers.push(stripePreOrderPaymentHandler);
        return config;
    },
})
export class StripePreOrderPlugin {
    static instance: StripePreOrderPlugin;

    constructor() {
        StripePreOrderPlugin.instance = this;
    }

    async onApplicationBootstrap() {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            Logger.info('Stripe Pre-Order Plugin with PaymentMethodHandler initialized', 'StripePreOrderPlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, Stripe Pre-Order Plugin disabled', 'StripePreOrderPlugin');
        }
    }
}