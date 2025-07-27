import {
    VendurePlugin,
    PluginCommonModule,
    EventBus,
    PaymentStateTransitionEvent,
    Logger,
    RequestContext,
    TransactionalConnection,
    Payment
} from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import Stripe from 'stripe';

/**
 * Plugin to capture Stripe payment method information and store it in Vendure payment metadata.
 * This extends the official StripePlugin to capture card details, wallet types, etc.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [StripePaymentMethodCapturePlugin],
    compatibility: '^3.0.0',
})
export class StripePaymentMethodCapturePlugin implements OnApplicationBootstrap {
    private stripe: Stripe | null = null;

    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection
    ) {}

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

            Logger.info(`Successfully captured payment method info for payment ${payment.id}: ${paymentMethod.type}`, 'StripePaymentMethodCapturePlugin');

        } catch (error) {
            Logger.error(`Failed to capture payment method info for payment ${payment.id}: ${error}`, 'StripePaymentMethodCapturePlugin');
        }
    }
}
