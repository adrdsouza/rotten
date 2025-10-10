import {
    VendurePlugin,
    PluginCommonModule,
    EventBus,
    PaymentStateTransitionEvent,
    Logger,
    RequestContext,
    TransactionalConnection,
    Payment,
    Refund,
    OrderService,
    Allow,
    Permission,
    Ctx
} from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Response } from 'express';
import Stripe from 'stripe';
import gql from 'graphql-tag';

/**
 * Webhook controller for handling Stripe refund events
 */
@Controller('stripe-refund-webhook')
class StripeRefundWebhookController {
    constructor(
        private connection: TransactionalConnection
    ) {}

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('stripe-signature') signature: string,
        @Res() res: Response
    ) {
        const plugin = StripeExtensionPlugin.instance;
        if (!plugin) {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).send('Plugin not initialized');
            return;
        }

        try {
            await plugin.handleRefundWebhook(body, signature);
            res.status(HttpStatus.OK).send('OK');
        } catch (error) {
            Logger.error(`Stripe refund webhook error: ${error}`, 'StripeRefundWebhook');
            res.status(HttpStatus.BAD_REQUEST).send('Webhook error');
        }
    }
}

/**
 * Resolver to override the official Stripe plugin's createStripePaymentIntent
 * to work with local cart data instead of requiring an active order
 */
@Resolver()
class StripePreOrderResolver {
    private stripe: Stripe;

    constructor() {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2023-08-16',
        });
    }

    @Mutation()
    @Allow(Permission.Public)
    async createPreOrderPaymentIntent(
        @Ctx() ctx: RequestContext,
        @Args('amount') amount?: number,
        @Args('currency') currency?: string,
        @Args('cartUuid') cartUuid?: string
    ): Promise<string> {
        const amountToUse = amount || 100; // Minimum $1.00 if no amount provided
        const currencyToUse = currency || 'usd';
        const cartUuidToUse = cartUuid || '';

        Logger.info(`Creating pre-order PaymentIntent for cart ${cartUuidToUse}: ${amountToUse} ${currencyToUse}`, 'StripePreOrder');

        const paymentIntent = await this.stripe.paymentIntents.create({
            amount: amountToUse,
            currency: currencyToUse,
            automatic_payment_methods: { enabled: true },
            metadata: {
                cartUuid: cartUuidToUse,
                channelToken: ctx.channel.token,  // Required by webhook validation
                languageCode: ctx.languageCode,   // Used by webhook processing
            },
        });

        Logger.info(`Pre-order PaymentIntent created: ${paymentIntent.id}`, 'StripePreOrder');

        return paymentIntent.client_secret!;
    }

    @Mutation()
    @Allow(Permission.Public)
    async updatePaymentIntentAmount(
        @Ctx() ctx: RequestContext,
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('amount') amount: number
    ): Promise<boolean> {
        try {
            Logger.info(`Updating PaymentIntent ${paymentIntentId} amount to ${amount}`, 'StripePreOrder');

            await this.stripe.paymentIntents.update(paymentIntentId, {
                amount: amount,
            });

            Logger.info(`PaymentIntent ${paymentIntentId} amount updated successfully`, 'StripePreOrder');
            return true;
        } catch (error) {
            Logger.error(`Failed to update PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrder');
            return false;
        }
    }

    @Mutation()
    @Allow(Permission.Public)
    async updatePaymentIntentMetadata(
        @Ctx() ctx: RequestContext,
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('orderCode') orderCode: string,
        @Args('orderId') orderId: number
    ): Promise<boolean> {
        try {
            Logger.info(`Updating PaymentIntent ${paymentIntentId} with order metadata: ${orderCode} (${orderId})`, 'StripePreOrder');

            // Get the current PaymentIntent to preserve existing metadata
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

            // Add only the missing order-specific metadata (channelToken and languageCode already set)
            await this.stripe.paymentIntents.update(paymentIntentId, {
                metadata: {
                    ...paymentIntent.metadata,
                    orderCode: orderCode,           // Required by webhook validation
                    orderId: orderId.toString(),    // Required by webhook validation
                }
            });

            Logger.info(`PaymentIntent ${paymentIntentId} order metadata added successfully`, 'StripePreOrder');
            return true;
        } catch (error) {
            Logger.error(`Failed to update PaymentIntent ${paymentIntentId} metadata: ${error}`, 'StripePreOrder');
            return false;
        }
    }

    /**
     * Combined mutation to update both amount and metadata in a single Stripe API call
     * OPTIMIZED: Accepts cartUuid to avoid retrieve call, reducing latency by ~700ms
     */
    @Mutation()
    @Allow(Permission.Public)
    async updatePaymentIntentWithOrder(
        @Ctx() ctx: RequestContext,
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('amount') amount: number,
        @Args('orderCode') orderCode: string,
        @Args('orderId') orderId: number,
        @Args('cartUuid') cartUuid?: string
    ): Promise<boolean> {
        try {
            Logger.info(`Updating PaymentIntent ${paymentIntentId} with amount ${amount} and order metadata: ${orderCode} (${orderId})`, 'StripePreOrder');
            Logger.info(`CartUuid provided: ${cartUuid || 'UNDEFINED - using slow path'}`, 'StripePreOrder');

            // OPTIMIZATION: If cartUuid is provided, use it directly without retrieve call
            // Otherwise, retrieve to preserve existing metadata (fallback for backward compatibility)
            if (cartUuid) {
                Logger.info(`Using FAST PATH - single Stripe API call`, 'StripePreOrder');
                // Fast path: We know the metadata from creation
                await this.stripe.paymentIntents.update(paymentIntentId, {
                    amount: amount,
                    metadata: {
                        cartUuid: cartUuid,
                        channelToken: ctx.channel.token,
                        languageCode: ctx.languageCode,
                        orderCode: orderCode,
                        orderId: orderId.toString(),
                    }
                });
            } else {
                // Slow path: Retrieve first to preserve metadata (backward compatibility)
                Logger.warn(`Using SLOW PATH - two Stripe API calls (retrieve + update)`, 'StripePreOrder');
                const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
                await this.stripe.paymentIntents.update(paymentIntentId, {
                    amount: amount,
                    metadata: {
                        ...paymentIntent.metadata,
                        orderCode: orderCode,
                        orderId: orderId.toString(),
                    }
                });
            }

            Logger.info(`PaymentIntent ${paymentIntentId} updated successfully with amount and order metadata`, 'StripePreOrder');
            return true;
        } catch (error) {
            Logger.error(`Failed to update PaymentIntent ${paymentIntentId}: ${error}`, 'StripePreOrder');
            return false;
        }
    }
}

/**
 * Plugin to capture Stripe payment method information and handle refund webhooks.
 * This extends the official StripePlugin to capture card details, wallet types, and process refunds.
 * Also overrides createStripePaymentIntent to work with local cart instead of requiring active order.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [StripeExtensionPlugin, StripePreOrderResolver],
    controllers: [StripeRefundWebhookController],
    shopApiExtensions: {
        resolvers: [StripePreOrderResolver],
        schema: gql`
            extend type Mutation {
                createPreOrderPaymentIntent(amount: Int, currency: String, cartUuid: String): String!
                updatePaymentIntentAmount(paymentIntentId: String!, amount: Int!): Boolean!
                updatePaymentIntentMetadata(paymentIntentId: String!, orderCode: String!, orderId: Int!): Boolean!
                updatePaymentIntentWithOrder(paymentIntentId: String!, amount: Int!, orderCode: String!, orderId: Int!, cartUuid: String): Boolean!
            }
        `,
    },
    compatibility: '^3.0.0',
})
export class StripeExtensionPlugin implements OnApplicationBootstrap {
    static instance: StripeExtensionPlugin;
    private stripe: Stripe | null = null;

    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
        private orderService: OrderService
    ) {
        StripeExtensionPlugin.instance = this;
    }

    async onApplicationBootstrap() {
        // Initialize Stripe client
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
            Logger.info('Stripe Payment Method Capture Plugin initialized', 'StripePaymentMethodCapturePlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, Stripe Payment Method Capture Plugin disabled', 'StripePaymentMethodCapturePlugin');
        }

        // TransactionalConnection is already injected via constructor

        // Listen for payment state transitions
        this.eventBus.ofType(PaymentStateTransitionEvent).subscribe(async (event) => {
            // Only process Stripe payments that are transitioning to Settled
            if (event.payment.method === 'stripe' && 
                event.toState === 'Settled' && 
                event.payment.transactionId &&
                this.stripe) {
                
                await this.capturePaymentMethodInfo(event.ctx, event.payment);
            }
        });
    }

    private async capturePaymentMethodInfo(ctx: RequestContext, payment: any) {
        try {
            if (!this.stripe || !payment.transactionId) {
                return;
            }

            Logger.info(`Capturing payment method info for payment ${payment.id} with transaction ${payment.transactionId}`, 'StripePaymentMethodCapturePlugin');

            // Retrieve the PaymentIntent from Stripe
            const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.transactionId, {
                expand: ['payment_method']
            });

            if (!paymentIntent.payment_method || typeof paymentIntent.payment_method === 'string') {
                Logger.warn(`No expanded payment method found for PaymentIntent ${payment.transactionId}`, 'StripePaymentMethodCapturePlugin');
                return;
            }

            const paymentMethod = paymentIntent.payment_method as Stripe.PaymentMethod;
            
            // Extract payment method information
            const paymentMethodInfo: any = {
                type: paymentMethod.type,
                created: paymentMethod.created,
            };

            // Handle different payment method types
            switch (paymentMethod.type) {
                case 'card':
                    if (paymentMethod.card) {
                        paymentMethodInfo.card = {
                            brand: paymentMethod.card.brand,
                            last4: paymentMethod.card.last4,
                            funding: paymentMethod.card.funding,
                            exp_month: paymentMethod.card.exp_month,
                            exp_year: paymentMethod.card.exp_year,
                            country: paymentMethod.card.country,
                        };

                        // Check for wallet information (Apple Pay, Google Pay, etc.)
                        if (paymentMethod.card.wallet) {
                            paymentMethodInfo.wallet = {
                                type: paymentMethod.card.wallet.type,
                            };
                        }
                    }
                    break;

                case 'paypal':
                    if (paymentMethod.paypal) {
                        paymentMethodInfo.paypal = {
                            payer_email: paymentMethod.paypal.payer_email,
                            payer_id: paymentMethod.paypal.payer_id,
                        };
                    }
                    break;

                case 'us_bank_account':
                    if (paymentMethod.us_bank_account) {
                        paymentMethodInfo.us_bank_account = {
                            account_type: paymentMethod.us_bank_account.account_type,
                            bank_name: paymentMethod.us_bank_account.bank_name,
                            last4: paymentMethod.us_bank_account.last4,
                            routing_number: paymentMethod.us_bank_account.routing_number,
                        };
                    }
                    break;

                case 'sepa_debit':
                    if (paymentMethod.sepa_debit) {
                        paymentMethodInfo.sepa_debit = {
                            bank_code: paymentMethod.sepa_debit.bank_code,
                            last4: paymentMethod.sepa_debit.last4,
                            country: paymentMethod.sepa_debit.country,
                        };
                    }
                    break;

                default:
                    // For other payment types, just store the type
                    Logger.info(`Unsupported payment method type: ${paymentMethod.type}`, 'StripePaymentMethodCapturePlugin');
                    break;
            }

            // Update the payment metadata with the captured information
            const updatedMetadata = {
                ...payment.metadata,
                paymentMethodInfo: paymentMethodInfo,
                capturedAt: new Date().toISOString(),
            };

            // Update the payment in the database using TransactionalConnection
            await this.connection.getRepository(ctx, Payment).update(payment.id, {
                metadata: updatedMetadata
            });

            Logger.info(`Successfully captured payment method info for payment ${payment.id}: ${paymentMethod.type}`, 'StripeExtensionPlugin');

        } catch (error) {
            Logger.error(`Failed to capture payment method info for payment ${payment.id}: ${error}`, 'StripeExtensionPlugin');
        }
    }

    /**
     * Handle Stripe refund webhooks to automatically settle refunds
     */
    async handleRefundWebhook(body: any, signature: string): Promise<void> {
        if (!this.stripe) {
            throw new Error('Stripe client not initialized');
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        }

        let event: Stripe.Event;

        try {
            // Verify webhook signature
            event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            Logger.error(`Webhook signature verification failed: ${err}`, 'StripeExtensionPlugin');
            throw err;
        }

        Logger.info(`Processing Stripe webhook event: ${event.type}`, 'StripeExtensionPlugin');

        // Handle refund-related events
        switch (event.type) {
            case 'charge.refunded':
                await this.handleChargeRefunded(event.data.object as Stripe.Charge);
                break;
            case 'charge.refund.updated':
                await this.handleRefundUpdated(event.data.object as Stripe.Refund);
                break;
            case 'refund.created':
                await this.handleRefundCreated(event.data.object as Stripe.Refund);
                break;
            case 'refund.updated':
                await this.handleRefundUpdated(event.data.object as Stripe.Refund);
                break;
            default:
                Logger.info(`Unhandled webhook event type: ${event.type}`, 'StripeExtensionPlugin');
        }
    }

    private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
        try {
            Logger.info(`Processing charge.refunded for charge: ${charge.id}`, 'StripeExtensionPlugin');

            // Find the payment by transaction ID (which is the PaymentIntent ID)
            const ctx = RequestContext.empty();
            const payment = await this.connection.getRepository(ctx, Payment).findOne({
                where: { transactionId: charge.payment_intent as string },
                relations: ['refunds']
            });

            if (!payment) {
                Logger.warn(`No payment found for charge: ${charge.id}`, 'StripeExtensionPlugin');
                return;
            }

            // Process each refund on this charge
            if (charge.refunds?.data) {
                for (const stripeRefund of charge.refunds.data) {
                    await this.settleRefundIfPending(ctx, payment, stripeRefund);
                }
            }

        } catch (error) {
            Logger.error(`Error handling charge.refunded: ${error}`, 'StripeExtensionPlugin');
        }
    }

    private async handleRefundCreated(refund: Stripe.Refund): Promise<void> {
        try {
            Logger.info(`Processing refund.created for refund: ${refund.id}`, 'StripeExtensionPlugin');

            const ctx = RequestContext.empty();
            const payment = await this.connection.getRepository(ctx, Payment).findOne({
                where: { transactionId: refund.payment_intent as string },
                relations: ['refunds']
            });

            if (!payment) {
                Logger.warn(`No payment found for refund: ${refund.id}`, 'StripeExtensionPlugin');
                return;
            }

            await this.settleRefundIfPending(ctx, payment, refund);

        } catch (error) {
            Logger.error(`Error handling refund.created: ${error}`, 'StripeExtensionPlugin');
        }
    }

    private async handleRefundUpdated(refund: Stripe.Refund): Promise<void> {
        try {
            Logger.info(`Processing refund.updated for refund: ${refund.id}`, 'StripeExtensionPlugin');

            const ctx = RequestContext.empty();
            const payment = await this.connection.getRepository(ctx, Payment).findOne({
                where: { transactionId: refund.payment_intent as string },
                relations: ['refunds']
            });

            if (!payment) {
                Logger.warn(`No payment found for refund: ${refund.id}`, 'StripeExtensionPlugin');
                return;
            }

            await this.settleRefundIfPending(ctx, payment, refund);

        } catch (error) {
            Logger.error(`Error handling refund.updated: ${error}`, 'StripeExtensionPlugin');
        }
    }

    private async settleRefundIfPending(ctx: RequestContext, payment: Payment, stripeRefund: Stripe.Refund): Promise<void> {
        try {
            // Find the corresponding Vendure refund
            const vendureRefund = payment.refunds?.find(r =>
                r.transactionId === stripeRefund.id ||
                (r.metadata as any)?.stripeRefundId === stripeRefund.id
            );

            if (!vendureRefund) {
                Logger.warn(`No Vendure refund found for Stripe refund: ${stripeRefund.id}`, 'StripeExtensionPlugin');
                return;
            }

            // Only settle if the refund is in Pending state and Stripe refund is succeeded
            if (vendureRefund.state === 'Pending' && stripeRefund.status === 'succeeded') {
                Logger.info(`Settling refund ${vendureRefund.id} for Stripe refund ${stripeRefund.id}`, 'StripeExtensionPlugin');

                // Use OrderService.settleRefund() to properly transition the refund state
                const settleResult = await this.orderService.settleRefund(ctx, {
                    id: vendureRefund.id,
                    transactionId: stripeRefund.id,
                });

                // Check if settlement was successful
                if (settleResult && 'id' in settleResult) {
                    Logger.info(`Successfully settled refund ${vendureRefund.id}`, 'StripeExtensionPlugin');
                } else {
                    Logger.error(`Failed to settle refund ${vendureRefund.id}: ${JSON.stringify(settleResult)}`, 'StripeExtensionPlugin');
                }
            } else {
                Logger.info(`Refund ${vendureRefund.id} is already in state: ${vendureRefund.state}, Stripe status: ${stripeRefund.status}`, 'StripeExtensionPlugin');
            }

        } catch (error) {
            Logger.error(`Error settling refund: ${error}`, 'StripeExtensionPlugin');
        }
    }


}
