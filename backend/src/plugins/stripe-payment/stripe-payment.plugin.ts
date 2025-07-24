import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { StripePaymentHandler } from './stripe-payment.handler';
import { StripeResolver } from './stripe.resolver';
import { stripeSchemaExtensions } from './stripe.schema';

/**
 * Stripe Payment Plugin for Vendure
 * Handles Stripe payment processing with Payment Intents API
 */
@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [StripeResolver],
  adminApiExtensions: {
    schema: stripeSchemaExtensions,
    resolvers: [StripeResolver],
  },
  shopApiExtensions: {
    schema: stripeSchemaExtensions,
    resolvers: [StripeResolver],
  },
  configuration: config => {
    config.paymentOptions.paymentMethodHandlers.push(StripePaymentHandler);
    return config;
  },
})
export class StripePaymentPlugin {}
