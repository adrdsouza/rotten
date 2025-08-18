import {
    VendurePlugin,
    PluginCommonModule,
    Logger,
    RequestContext,
    TransactionalConnection,
    OrderService,
    PaymentService,
    PaymentStateTransitionError,
    Payment,
    RequestContextService,
    PaymentMethodService,
    ChannelService,
    Order,
    LanguageCode,
} from '@vendure/core';
import { Controller, Post, Body, Headers, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { Args, Mutation, Query, Resolver, Context } from '@nestjs/graphql';
import gql from 'graphql-tag';
import Stripe from 'stripe';

/**
 * GraphQL resolver for Stripe pre-order PaymentIntent operations
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
     * Create a PaymentIntent before order creation for immediate payment form rendering
     */
    @Mutation(() => String)
    async createPreOrderStripePaymentIntent(
        @Args('estimatedTotal') estimatedTotal: number,
        @Args('currency') currency: string = 'usd'
    ): Promise<string> {
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`Creating pre-order PaymentIntent for estimated total: ${estimatedTotal}`, 'StripePreOrderPlugin');

            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: estimatedTotal,
                currency: currency,
                // Removed confirmation_method: 'manual' - Payment Element requires automatic confirmation
                metadata: {
                    source: 'pre_order_validation',
                    created_at: new Date().toISOString(),
                    estimated_total: estimatedTotal.toString()
                }
            });

            Logger.info(`Pre-order PaymentIntent created: ${paymentIntent.id}`, 'StripePreOrderPlugin');
            return paymentIntent.client_secret as string;

        } catch (error) {
            Logger.error(`Failed to create pre-order PaymentIntent: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to initialize payment. Please try again.');
        }
    }

    /**
     * Update PaymentIntent amount and link it to a created Vendure order
     * CRITICAL: Also creates Payment record in Vendure database for webhook processing
     */
    @Mutation(() => Boolean)
    async linkPaymentIntentToOrder(
        @Args('paymentIntentId') paymentIntentId: string,
        @Args('orderId') orderId: string,
        @Args('orderCode') orderCode: string,
        @Args('finalTotal') finalTotal: number,
        @Args('customerEmail') customerEmail: string,
        @Context() ctx: RequestContext
    ): Promise<boolean> {
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
        
        if (!this.stripe) {
            throw new Error('Stripe is not initialized');
        }

        try {
            Logger.info(`Linking PaymentIntent ${paymentIntentId} to order ${orderCode} (ID: ${orderId}, Total: ${finalTotal}, Email: ${customerEmail || 'guest'})`, 'StripePreOrderPlugin');

            // 1. Update PaymentIntent with final order details
            const updateParams = {
                amount: finalTotal, // Update to final order total
                metadata: {
                    // CRITICAL: Use exact metadata keys expected by Vendure's StripePlugin webhook handler
                    vendure_order_code: orderCode,
                    vendure_order_id: orderId,
                    vendure_customer_email: customerEmail || 'guest',
                    // Keep our custom fields for tracking
                    source: 'order_linked',
                    final_total: finalTotal.toString(),
                    linked_at: new Date().toISOString()
                }
            };

            Logger.info(`[STRIPE API] Updating PaymentIntent ${paymentIntentId} with params: ${JSON.stringify(updateParams)}`, 'StripePreOrderPlugin');
            
            const updatedPaymentIntent = await this.stripe.paymentIntents.update(paymentIntentId, updateParams);
            
            Logger.info(`[STRIPE API] PaymentIntent updated successfully. New metadata: ${JSON.stringify(updatedPaymentIntent.metadata)}`, 'StripePreOrderPlugin');

            // 2. CRITICAL FIX: Create Payment record using EXACT official StripePlugin logic
            await this.createPaymentRecord(paymentIntentId, orderId, orderCode, finalTotal);

            Logger.info(`Successfully linked PaymentIntent to order ${orderCode}`, 'StripePreOrderPlugin');
            return true;

        } catch (error) {
            Logger.error(`Failed to link PaymentIntent to order: ${error}`, 'StripePreOrderPlugin');
            Logger.error(`Error details: ${JSON.stringify({
                paymentIntentId,
                orderId,
                orderCode,
                finalTotal,
                customerEmail,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined
            })}`, 'StripePreOrderPlugin');
            throw new Error('Failed to finalize payment setup. Please try again.');
        }
    }


    /**
     * Create proper RequestContext like the official StripePlugin does
     */
    private async createContext(channelToken: string, languageCode: string): Promise<RequestContext> {
        return this.requestContextService.create({
            apiType: 'admin',
            channelOrToken: channelToken,
            languageCode: languageCode as LanguageCode,
        });
    }

    /**
     * Get the Stripe payment method exactly like the official StripePlugin does
     */
    private async getPaymentMethod(ctx: RequestContext) {
        const method = (await this.paymentMethodService.findAll(ctx)).items.find(m => m.handler.code === 'stripe');
        if (!method) {
            throw new Error(`Could not find Stripe PaymentMethod`);
        }
        return method;
    }

    /**
     * Create Payment record using the EXACT logic from official StripePlugin webhook handler
     */
    private async createPaymentRecord(
        paymentIntentId: string,
        orderId: string,
        orderCode: string,
        amount: number,
        channelToken: string = 'default-channel',
        languageCode: string = 'en'
    ): Promise<void> {
        // Create proper context exactly like official StripePlugin
        const outerCtx = await this.createContext(channelToken, languageCode);
        
        // Use transaction exactly like official StripePlugin webhook handler (lines 60-121)
        await this.connection.withTransaction(outerCtx, async (ctx) => {
            const order = await this.orderService.findOneByCode(ctx, orderCode);
            if (!order) {
                throw new Error(`Unable to find order ${orderCode}, unable to settle payment ${paymentIntentId}!`);
            }

            // Ensure order is in ArrangingPayment state (lines 87-106 from official plugin)
            if (order.state !== 'ArrangingPayment') {
                let transitionToStateResult = await this.orderService.transitionToState(ctx, parseInt(orderId, 10), 'ArrangingPayment');
                
                // If the channel specific context fails, try to use the default channel context
                if (transitionToStateResult && 'errorCode' in transitionToStateResult) {
                    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
                    const ctxWithDefaultChannel = await this.createContext(defaultChannel.token, languageCode);
                    transitionToStateResult = await this.orderService.transitionToState(ctxWithDefaultChannel, parseInt(orderId, 10), 'ArrangingPayment');
                }
                
                // If the order is still not in the ArrangingPayment state, log an error
                if (transitionToStateResult && 'errorCode' in transitionToStateResult) {
                    Logger.error(`Error transitioning order ${orderCode} to ArrangingPayment state: ${transitionToStateResult.message}`, 'StripePreOrderPlugin');
                    return;
                }
            }

            const paymentMethod = await this.getPaymentMethod(ctx);
            
            // EXACT payment creation logic from official StripePlugin (lines 108-120)
            const addPaymentToOrderResult = await this.orderService.addPaymentToOrder(ctx, parseInt(orderId, 10), {
                method: paymentMethod.code,
                metadata: {
                    paymentIntentAmountReceived: amount,
                    paymentIntentId: paymentIntentId,
                },
            });

            if (!(addPaymentToOrderResult instanceof Order)) {
                const errorMessage = (addPaymentToOrderResult as any).message || 'Unknown error';
                Logger.error(`Error adding payment to order ${orderCode}: ${errorMessage}`, 'StripePreOrderPlugin');
                throw new Error(`Failed to add payment to order: ${errorMessage}`);
            }

            // The payment intent ID is added to the order only if we can reach this point.
            Logger.info(`Stripe payment intent id ${paymentIntentId} added to order ${orderCode}`, 'StripePreOrderPlugin');
        });
    }

    /**
     * Calculate estimated total from cart items (for pre-order PaymentIntent)
     */
    @Query(() => Number)
    async calculateEstimatedTotal(
        @Args('cartItems', { type: () => [PreOrderCartItemInput] }) cartItems: PreOrderCartItemInput[]
    ): Promise<number> {
        try {
            // Basic estimation - in production, you'd want to include tax calculations, shipping estimates, etc.
            const subtotal = cartItems.reduce((total, item) => {
                return total + (item.unitPrice * item.quantity);
            }, 0);

            // Add estimated tax/shipping (10% estimation for demo purposes)
            const estimatedTotal = Math.round(subtotal * 1.1);

            Logger.info(`Calculated estimated total: ${estimatedTotal} from ${cartItems.length} items`, 'StripePreOrderPlugin');
            return estimatedTotal;

        } catch (error) {
            Logger.error(`Failed to calculate estimated total: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to calculate order total');
        }
    }
}

/**
 * Input type for cart items in estimated total calculation
 */
export class PreOrderCartItemInput {
    productVariantId: string;
    quantity: number;
    unitPrice: number;
}

/**
 * Webhook controller for handling Stripe events related to pre-order PaymentIntents
 */
@Controller('stripe-preorder-webhook')
export class StripePreOrderWebhookController {
    constructor(private connection: TransactionalConnection) {}

    @Post()
    async handleWebhook(
        @Body() body: any,
        @Headers('stripe-signature') signature: string,
        @Res() res: Response
    ) {
        const plugin = StripePreOrderPlugin.instance;
        if (!plugin) {
            res.status(HttpStatus.SERVICE_UNAVAILABLE).send('Plugin not initialized');
            return;
        }

        try {
            await plugin.handlePreOrderWebhook(body, signature);
            res.status(HttpStatus.OK).send('OK');
        } catch (error) {
            Logger.error(`Stripe pre-order webhook error: ${error}`, 'StripePreOrderWebhook');
            res.status(HttpStatus.BAD_REQUEST).send('Webhook error');
        }
    }
}

/**
 * Plugin for handling Stripe PaymentIntents before order creation
 * Enables immediate payment form rendering without requiring existing Vendure orders
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [StripePreOrderPlugin, StripePreOrderResolver],
    controllers: [StripePreOrderWebhookController],
    shopApiExtensions: {
        resolvers: [StripePreOrderResolver],
        schema: gql`
            extend type Mutation {
                createPreOrderStripePaymentIntent(estimatedTotal: Int!, currency: String = "usd"): String!
                linkPaymentIntentToOrder(paymentIntentId: String!, orderId: String!, orderCode: String!, finalTotal: Int!, customerEmail: String): Boolean!
            }

            extend type Query {
                calculateEstimatedTotal(cartItems: [PreOrderCartItemInput!]!): Int!
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
    private stripe: Stripe | null = null;

    constructor(
        private connection: TransactionalConnection,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private requestContextService: RequestContextService,
        private paymentMethodService: PaymentMethodService,
        private channelService: ChannelService
    ) {
        StripePreOrderPlugin.instance = this;
    }

    async onApplicationBootstrap() {
        // Initialize Stripe client
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
            Logger.info('Stripe Pre-Order Plugin initialized with webhook support', 'StripePreOrderPlugin');
        } else {
            Logger.warn('STRIPE_SECRET_KEY not found, Stripe Pre-Order Plugin disabled', 'StripePreOrderPlugin');
        }
    }

    /**
     * Handle Stripe webhooks for pre-order PaymentIntents
     */
    async handlePreOrderWebhook(body: any, signature: string): Promise<void> {
        if (!this.stripe) {
            throw new Error('Stripe client not initialized');
        }

        const webhookSecret = process.env.STRIPE_PREORDER_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_PREORDER_WEBHOOK_SECRET not configured');
        }

        let event: Stripe.Event;

        try {
            // Verify webhook signature
            event = this.stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err) {
            Logger.error(`Pre-order webhook signature verification failed: ${err}`, 'StripePreOrderPlugin');
            throw err;
        }

        Logger.info(`Processing Stripe pre-order webhook event: ${event.type}`, 'StripePreOrderPlugin');

        // Handle pre-order specific events - mostly just logging
        // Let the official StripePlugin handle payment processing
        switch (event.type) {
            case 'payment_intent.created':
                await this.handlePaymentIntentCreated(event.data.object as Stripe.PaymentIntent);
                break;
            case 'payment_intent.payment_failed':
                await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
                break;
            case 'payment_intent.succeeded':
                // Just log success - let the official StripePlugin webhook handle the actual settlement
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                const metadata = paymentIntent.metadata;
                if (metadata?.vendure_order_code) {
                    Logger.info(`Pre-order PaymentIntent ${paymentIntent.id} succeeded for order ${metadata.vendure_order_code} - letting official StripePlugin handle settlement`, 'StripePreOrderPlugin');
                } else {
                    Logger.info(`Pre-order PaymentIntent ${paymentIntent.id} succeeded but no order metadata - likely not yet linked to an order`, 'StripePreOrderPlugin');
                }
                break;
            default:
                Logger.info(`Unhandled pre-order webhook event type: ${event.type}`, 'StripePreOrderPlugin');
        }
    }

    private async handlePaymentIntentCreated(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        Logger.info(`Pre-order PaymentIntent created: ${paymentIntent.id}`, 'StripePreOrderPlugin');
        // Add any tracking logic here if needed
    }

    private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
        Logger.warn(`Pre-order PaymentIntent failed: ${paymentIntent.id}`, 'StripePreOrderPlugin');
        // Add failure handling logic here if needed
    }

}