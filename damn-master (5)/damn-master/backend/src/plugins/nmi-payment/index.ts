import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { nmiPaymentHandler } from './nmi-payment-handler.js';

/**
 * NMI Payment Plugin for Vendure
 *
 * Integrates the NMI (Network Merchants Inc.) payment gateway with Vendure,
 * enabling secure payment processing using Collect.js for tokenization,
 * and supporting sale, void, and refund transactions.
 */
@VendurePlugin({
  compatibility: '^3.3.0',
  imports: [PluginCommonModule],
  configuration: (config) => {
    config.paymentOptions.paymentMethodHandlers = [
      ...(config.paymentOptions.paymentMethodHandlers || []),
      nmiPaymentHandler,
    ];
    return config;
  },
})
export class NmiPaymentPlugin {}
