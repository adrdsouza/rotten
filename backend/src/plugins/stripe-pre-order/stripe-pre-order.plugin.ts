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
            
            return {
                clientSecret: paymentIntent.client_secret as string,
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                currency: paymentIntent.currency
            };

        } catch (error) {
            Logger.error(`Failed to create pre-order PaymentIntent: ${error}`, 'StripePreOrderPlugin');
            throw new Error('Failed to initialize payment. Please try again.');
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

            // 1. Update PaymentIntent with final order details
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
            throw new Error('Failed to finalize payment setup. Please try again.');
        }
    }

    /**
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
    }
}

/**
 * Enhanced webhook controller with proper security
 */
@Controller('stripe-preorder-webhook')
export class StripePreOrderWebhookController {
    private stripe: Stripe | null = null;

    constructor(private connection: TransactionalConnection) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey) {
            this.stripe = new Stripe(stripeSecretKey, {
                apiVersion: '2023-08-16',
            });
        }
    }

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
    providers: [StripePreOrderResolver],
    controllers: [StripePreOrderWebhookController],
    entities: [PendingStripePayment],
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