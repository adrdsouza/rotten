import { VendurePlugin, PluginCommonModule, Type } from '@vendure/core';
import { SheerIdController } from './sheerid.controller.js';
import { SheerIdService } from './sheerid.service.js';
import { SheerIdPluginOptions } from './types.js';
import { verifiedCustomerCondition } from './promotion-conditions/verified-customer.condition.js';

/**
 * Simplified SheerID Plugin
 * 
 * This plugin provides minimal backend support for SheerID verification:
 * - Webhook processing for verification completion
 * - Customer verification status updates
 * - Promotion condition for verified customers
 * 
 * Frontend handles all program configurations and UI.
 */

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [SheerIdController],
  providers: [
    SheerIdService,
    {
      provide: 'SHEERID_PLUGIN_OPTIONS',
      useFactory: () => SheerIdPlugin.options,
    },
  ],
  configuration: config => {
    config.promotionOptions.promotionConditions.push(verifiedCustomerCondition);
    return config;
  },
  compatibility: '^3.0.0',
})
export class SheerIdPlugin {
  static options: SheerIdPluginOptions;

  static init(options: SheerIdPluginOptions): Type<SheerIdPlugin> {
    this.options = options;
    return SheerIdPlugin;
  }
}

export { SheerIdService } from './sheerid.service.js';
export { SheerIdController } from './sheerid.controller.js';
export * from './types.js';
