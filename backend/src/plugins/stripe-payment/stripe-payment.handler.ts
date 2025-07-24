import {
  CreatePaymentResult,
  CreateRefundResult,
  PaymentMethodHandler,
  SettlePaymentResult,
  LanguageCode,
  Logger,
  Injector,
} from '@vendure/core';
import Stripe from 'stripe';

let stripe: Stripe;

export const StripePaymentHandler = new PaymentMethodHandler({
  code: 'stripe',
  description: [
    {
      languageCode: LanguageCode.en,
      value: 'Stripe Payment',
    },
  ],
  args: {
    publishableKey: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Publishable Key' }],
    },
    secretKey: {
      type: 'string',
      label: [{ languageCode: LanguageCode.en, value: 'Secret Key' }],
    },
  },

  init(injector: Injector) {
    // Stripe will be initialized with args from the payment method configuration
    // This is handled in the payment method setup
  },

  createPayment: async (ctx, order, amount, args, metadata): Promise<CreatePaymentResult> => {
    try {
      // Initialize Stripe with the secret key from args
      if (!stripe) {
        stripe = new Stripe(args.secretKey, {
          apiVersion: '2025-02-24.acacia',
        });
      }

      const paymentIntentId = metadata.paymentIntentId;

      if (!paymentIntentId) {
        return {
          state: 'Declined' as const,
          errorMessage: 'No payment intent ID provided',
          amount,
        };
      }

      // Retrieve the payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        return {
          state: 'Settled' as const,
          transactionId: paymentIntent.id,
          amount,
        };
      } else if (paymentIntent.status === 'requires_confirmation') {
        return {
          state: 'Authorized' as const,
          transactionId: paymentIntent.id,
          amount,
        };
      } else {
        return {
          state: 'Declined' as const,
          errorMessage: `Payment intent status: ${paymentIntent.status}`,
          amount,
        };
      }
    } catch (error: any) {
      Logger.error(`Stripe payment error: ${error?.message}`, 'StripePaymentHandler');
      return {
        state: 'Declined' as const,
        errorMessage: error?.message || 'Payment failed',
        amount,
      };
    }
  },

  settlePayment: async (ctx, order, payment, args): Promise<SettlePaymentResult> => {
    try {
      // Initialize Stripe if not already done
      if (!stripe) {
        stripe = new Stripe(args.secretKey, {
          apiVersion: '2025-02-24.acacia',
        });
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(payment.transactionId);

      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          metadata: { stripePaymentIntentId: paymentIntent.id }
        };
      } else {
        // For Vendure, we need to throw an error instead of returning success: false
        throw new Error(`Payment intent status: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      Logger.error(`Stripe settle payment error: ${error?.message}`, 'StripePaymentHandler');
      // Re-throw the error - Vendure will handle it appropriately
      throw error;
    }
  },

  createRefund: async (ctx, input, amount, order, payment, args): Promise<CreateRefundResult> => {
    try {
      // Initialize Stripe if not already done
      if (!stripe) {
        stripe = new Stripe(args.secretKey, {
          apiVersion: '2025-02-24.acacia',
        });
      }

      const refund = await stripe.refunds.create({
        payment_intent: payment.transactionId,
        amount: Math.round(amount),
      });

      return {
        state: 'Settled' as const,
        transactionId: refund.id,
      };
    } catch (error: any) {
      Logger.error(`Stripe refund error: ${error?.message}`, 'StripePaymentHandler');
      return {
        state: 'Failed' as const,
        transactionId: '',
      };
    }
  },
});
