import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';
import { StaleOrderCleanupService } from '../services/stale-order-cleanup.service.js';

/**
 * Plugin that handles automatic cleanup of stale orders to prevent
 * checkout issues for signed-in users with existing orders in ArrangingPayment state.
 *
 * This plugin runs a background service that checks for stale orders every hour
 * and automatically cancels orders stuck in ArrangingPayment, AddingItems, and PaymentAuthorized states for more than the configured timeout period.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [StaleOrderCleanupService],
    compatibility: '^3.0.0',
})
export class StaleOrderCleanupPlugin {
    static init(): Type<StaleOrderCleanupPlugin> {
        return StaleOrderCleanupPlugin;
    }
}
