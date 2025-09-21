import {
    VendurePlugin,
    PluginCommonModule,
    EventBus,
    OrderStateTransitionEvent,
    Logger,
    RequestContext,
    TransactionalConnection,
    OnVendureBootstrap,
} from '@vendure/core';

const loggerCtx = 'ActiveOrderSessionFixPlugin';

/**
 * Plugin to fix the issue where completed orders remain as activeOrderId in sessions.
 * This ensures that when orders transition to PaymentSettled or PaymentAuthorized,
 * the session's activeOrderId is cleared so that new orders can be created properly.
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    compatibility: '^3.0.0',
})
export class ActiveOrderSessionFixPlugin implements OnVendureBootstrap {
    constructor(
        private eventBus: EventBus,
        private connection: TransactionalConnection,
    ) {}

    async onVendureBootstrap(): Promise<void> {
        // Listen for order state transitions
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
            const { order, toState, ctx } = event;
            
            // Clear session activeOrderId when order reaches a final state
            if (toState === 'PaymentSettled' || toState === 'PaymentAuthorized') {
                try {
                    await this.clearActiveOrderFromSessions(ctx, order.id);
                    Logger.verbose(
                        `Cleared activeOrderId for completed order ${order.code} (${order.id}) from sessions`,
                        loggerCtx,
                    );
                } catch (error) {
                    Logger.error(
                        `Failed to clear activeOrderId for order ${order.code}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        loggerCtx,
                    );
                }
            }
        });

        Logger.info('ActiveOrderSessionFixPlugin initialized - will clear session activeOrderId for completed orders', loggerCtx);
    }

    /**
     * Clear the activeOrderId from all sessions that reference the given order
     */
    private async clearActiveOrderFromSessions(ctx: RequestContext, orderId: string | number): Promise<void> {
        try {
            const result = await this.connection.rawConnection.query(
                `UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" = $1`,
                [orderId.toString()]
            );
            
            if (result.affectedRows > 0) {
                Logger.verbose(
                    `Cleared activeOrderId from ${result.affectedRows} sessions for order ${orderId}`,
                    loggerCtx,
                );
            }
        } catch (error) {
            Logger.error(
                `Database error clearing activeOrderId for order ${orderId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                loggerCtx,
            );
            throw error;
        }
    }
}