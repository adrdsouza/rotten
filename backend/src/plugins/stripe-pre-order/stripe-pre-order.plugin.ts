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
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import gql from 'graphql-tag';
import Stripe from 'stripe';

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
            Logger.info(`[STRIPE_HANDLER] Creating payment for order ${order.code}, amount: ${amount}`, 'StripePreOrderPlugin');
            Logger.info(`[STRIPE_HANDLER] Received metadata: ${JSON.stringify(metadata)}`, 'StripePreOrderPlugin');

            // Extract PaymentIntent ID from metadata
            // Handle both direct string and object with paymentIntentId property
            let paymentIntentId: string;
            
            if (typeof metadata === 'string') {
                paymentIntentId = metadata;
            } else if (metadata && typeof metadata === 'object' && metadata.paymentIntentId) {
                paymentIntentId = metadata.paymentIntentId;
            } else {
                Logger.error(`[STRIPE_HANDLER] No PaymentIntent ID provided in metadata: ${JSON.stringify(metadata)}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Error' as any,
                    errorMessage: 'PaymentIntent ID is required',
                };
            }

            if (!paymentIntentId || typeof paymentIntentId !== 'string') {
                Logger.error(`[STRIPE_HANDLER] Invalid PaymentIntent ID: ${paymentIntentId}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: 'PaymentIntent ID must be a valid string',
                };
            }

            Logger.info(`[STRIPE_HANDLER] Processing PaymentIntent: ${paymentIntentId}`, 'StripePreOrderPlugin');

            // Initialize Stripe
            const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
            if (!stripeSecretKey) {
                Logger.error(`[STRIPE_HANDLER] Stripe secret key not configured`, 'StripePreOrderPlugin');
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
                Logger.error(`[STRIPE_HANDLER] PaymentIntent ${paymentIntentId} not succeeded: ${paymentIntent.status}`, 'StripePreOrderPlugin');
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
                Logger.error(`[STRIPE_HANDLER] Amount mismatch - Expected: ${expectedAmountInCents}, Actual: ${actualAmountInCents}`, 'StripePreOrderPlugin');
                return {
                    amount,
                    state: 'Declined' as any,
                    errorMessage: 'Payment amount does not match order total',
                };
            }

            Logger.info(`[STRIPE_HANDLER] Payment verified successfully for ${paymentIntentId}`, 'StripePreOrderPlugin');

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
            Logger.error(`[STRIPE_HANDLER] Error processing payment: ${error}`, 'StripePreOrderPlugin');
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
        private channelService: ChannelService
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
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`Linking PaymentIntent ${paymentIntentId} to order ${orderCode}`, 'StripePreOrderPlugin');

            // Update PaymentIntent with final order details
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

            // Store pending payment (NO Vendure Payment record yet)
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
            throw new Error('Failed to finalize payment setup. Please try again.');
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
    providers: [StripePreOrderResolver],
    controllers: [StripePreOrderWebhookController],
    entities: [PendingStripePayment],
    shopApiExtensions: {
        resolvers: [StripePreOrderResolver],
        schema: gql`
            extend type Mutation {
                createPreOrderStripePaymentIntent(estimatedTotal: Int!, currency: String = "usd"): PaymentIntentResult!
                linkPaymentIntentToOrder(paymentIntentId: String!, orderId: String!, orderCode: String!, finalTotal: Int!, customerEmail: String): Boolean!
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