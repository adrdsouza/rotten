import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import * as cron from 'node-cron';
import {
    Logger,
    Order,
    OrderService,
    RequestContext,
    ChannelService,
    TransactionalConnection,
} from '@vendure/core';

const loggerCtx = 'StaleOrderCleanupService';

@Injectable()
export class StaleOrderCleanupService implements OnApplicationBootstrap, OnApplicationShutdown {
    private cleanupJob: cron.ScheduledTask | null = null;
    private readonly CLEANUP_CRON = process.env.ORDER_CLEANUP_CRON || '0 * * * *'; // Every hour by default
    private readonly MAX_AGE_MINUTES = Number(process.env.ORDER_CLEANUP_MAX_AGE_MINUTES || 30);
    private readonly BATCH_SIZE = Number(process.env.ORDER_CLEANUP_BATCH_SIZE || 100);
    private readonly MAX_PAGES = Number(process.env.ORDER_CLEANUP_MAX_PAGES || 100);
    private readonly RUN_ON_STARTUP = process.env.ORDER_CLEANUP_RUN_ON_STARTUP?.toLowerCase() === 'true';

    // Cancelled order deletion configuration
    private readonly DELETE_CANCELLED_ORDERS = process.env.ORDER_DELETE_CANCELLED_ENABLED?.toLowerCase() === 'true';
    private readonly CANCELLED_ORDER_MIN_AGE_DAYS = Number(process.env.ORDER_DELETE_CANCELLED_MIN_AGE_DAYS || 7); // Default: 7 days

    constructor(
        private orderService: OrderService,
        private channelService: ChannelService,
        private connection: TransactionalConnection,
    ) {}

    async onApplicationBootstrap() {
        // Optionally run cleanup immediately on startup
        if (this.RUN_ON_STARTUP) {
            Logger.info('Running initial cleanup on startup...', loggerCtx);
            await this.runCleanup();
        }
        
        // Start the recurring cleanup job
        await this.startRecurringCleanup();
        
        Logger.info(
            `Stale order cleanup service initialized - cron schedule: ${this.CLEANUP_CRON}, max age: ${this.MAX_AGE_MINUTES} minutes, batch size: ${this.BATCH_SIZE}, max pages: ${this.MAX_PAGES}, cancelled order deletion: ${this.DELETE_CANCELLED_ORDERS ? 'enabled' : 'disabled'}`,
            loggerCtx,
        );
    }

    onApplicationShutdown() {
        if (this.cleanupJob) {
            this.cleanupJob.stop();
            Logger.info('Stale order cleanup service stopped', loggerCtx);
        }
    }

    private async startRecurringCleanup() {
        // Start cron job for recurring cleanup
        this.cleanupJob = cron.schedule(this.CLEANUP_CRON, async () => {
            await this.runCleanup();
        });
        
        Logger.info(
            `Scheduled stale order cleanup with cron: ${this.CLEANUP_CRON}`,
            loggerCtx,
        );
    }

    private async runCleanup(): Promise<void> {
        Logger.info(
            `Starting scheduled stale order cleanup (maxAge: ${this.MAX_AGE_MINUTES} minutes)`,
            loggerCtx,
        );
        
        try {
            const cancelledCount = await this.cancelStaleOrders(this.MAX_AGE_MINUTES);

            if (cancelledCount > 0) {
                Logger.info(
                    `Stale order cleanup completed: cancelled ${cancelledCount} stale orders`,
                    loggerCtx,
                );
            } else {
                Logger.info('No stale orders found to clean up', loggerCtx);
            }

            // Run cancelled order deletion if enabled
            if (this.DELETE_CANCELLED_ORDERS) {
                const deletedCount = await this.deleteCancelledOrdersWithoutRefunds();
                if (deletedCount > 0) {
                    Logger.info(
                        `Cancelled order deletion completed: deleted ${deletedCount} cancelled orders without refunds`,
                        loggerCtx,
                    );
                }
            }


        } catch (error) {
            Logger.error(
                `Cleanup job failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                loggerCtx,
            );
        }
    }

    /**
     * Manually trigger cleanup for immediate use (e.g., for testing or manual cleanup)
     */
    async triggerManualCleanup(maxAgeMinutes?: number): Promise<number> {
        const ageLimit = maxAgeMinutes || this.MAX_AGE_MINUTES;

        Logger.info(`Manual cleanup triggered (maxAge: ${ageLimit} minutes)`, loggerCtx);

        try {
            const cancelledCount = await this.cancelStaleOrders(ageLimit);

            Logger.info(`Manual cleanup completed: cancelled ${cancelledCount} stale orders`, loggerCtx);

            return cancelledCount;
        } catch (error) {
            Logger.error(
                `Manual cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                loggerCtx,
            );
            return 0;
        }
    }

    /**
     * Manually trigger deletion of cancelled orders without refunds
     * @param minAgeDays Minimum age in days for orders to be deleted (default: uses configured value)
     */
    async triggerManualCancelledOrderDeletion(minAgeDays?: number): Promise<number> {
        const ageLimit = minAgeDays || this.CANCELLED_ORDER_MIN_AGE_DAYS;
        return await this.deleteCancelledOrdersWithoutRefunds(ageLimit);
    }

    /**
     * Cancel stale orders that are stuck in ArrangingPayment or AddingItems state using batched pagination
     */
    private async cancelStaleOrders(maxAgeMinutes: number): Promise<number> {
        const cutoffTime = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
        
        try {
            // Create admin RequestContext for order operations
            const defaultChannel = await this.channelService.getDefaultChannel();
            const ctx = new RequestContext({
                apiType: 'admin',
                authorizedAsOwnerOnly: false,
                isAuthorized: true,
                channel: defaultChannel,
            });

            let page = 0;
            let totalCancelled = 0;
            let moreOrders = true;

            Logger.debug(`Starting batched order cleanup with cutoff time: ${cutoffTime.toISOString()}`, loggerCtx);

            while (moreOrders) {
                // Use Vendure's OrderService.findAll with proper filters and pagination
                // Look for orders in ArrangingPayment, AddingItems, and PaymentAuthorized states
                const { items: staleOrders } = await this.orderService.findAll(ctx, {
                    filter: {
                        state: { in: ['ArrangingPayment', 'AddingItems', 'PaymentAuthorized'] },
                        updatedAt: { before: cutoffTime },
                    },
                    take: this.BATCH_SIZE,
                    skip: page * this.BATCH_SIZE,
                });
                
                moreOrders = staleOrders.length > 0;
                
                if (staleOrders.length === 0) {
                    if (page === 0) {
                        Logger.verbose('No stale orders found to clean up', loggerCtx);
                    }
                    break;
                }
                
                Logger.info(
                    `Processing batch ${page + 1}: Found ${staleOrders.length} stale orders (batch size: ${this.BATCH_SIZE})`,
                    loggerCtx,
                );
                
                let batchCancelled = 0;
                
                for (const order of staleOrders) {
                    try {
                        // Use proper Vendure state transition instead of direct DB update
                        const result = await this.orderService.transitionToState(ctx, order.id, 'Cancelled');
                        
                        if (result instanceof Order) {
                            batchCancelled++;
                            totalCancelled++;
                            Logger.verbose(
                                `Cancelled stale order ${order.code} (ID: ${order.id}, age: ${this.getOrderAge(order.updatedAt)} minutes)`,
                                loggerCtx,
                            );
                        } else {
                            // If normal transition fails, try transitioning through intermediate states
                            Logger.verbose(
                                `Normal transition failed for ${order.code} (${result.message}), attempting transition through intermediate states`,
                                loggerCtx,
                            );

                            const cancelled = await this.cancelOrderThroughIntermediateStates(ctx, order);
                            if (cancelled) {
                                batchCancelled++;
                                totalCancelled++;
                                Logger.verbose(
                                    `Cancelled stale order ${order.code} (ID: ${order.id}, age: ${this.getOrderAge(order.updatedAt)} minutes) via intermediate states`,
                                    loggerCtx,
                                );
                            } else {
                                Logger.warn(
                                    `Failed to cancel stale order ${order.code} through all transition methods`,
                                    loggerCtx,
                                );
                            }
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        Logger.error(
                            `Failed to cancel stale order ${order.code}: ${errorMessage}`,
                            loggerCtx,
                        );
                        
                        // Log verbose details for debugging
                        Logger.verbose(
                            `Order ${order.code} cancellation error details: ${JSON.stringify({
                                orderId: order.id,
                                orderCode: order.code,
                                currentState: order.state,
                                updatedAt: order.updatedAt,
                                error: errorMessage,
                            })}`,
                            loggerCtx,
                        );
                    }
                }
                
                Logger.info(
                    `Batch ${page + 1} completed: cancelled ${batchCancelled}/${staleOrders.length} orders`,
                    loggerCtx,
                );
                
                page++;
                
                // Safety limit to prevent runaway pagination
                if (page > this.MAX_PAGES) {
                    Logger.warn(
                        `Reached maximum pagination limit (${this.MAX_PAGES} pages). Stopping cleanup. Total cancelled: ${totalCancelled}`,
                        loggerCtx,
                    );
                    break;
                }
            }
            
            if (totalCancelled > 0) {
                Logger.info(
                    `Cleanup completed: cancelled ${totalCancelled} stale orders across ${page} batches`,
                    loggerCtx,
                );
            }
            
            return totalCancelled;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(
                `Error during stale order cleanup: ${errorMessage}`,
                loggerCtx,
            );
            
            // Log detailed error information for debugging
            Logger.verbose(
                `Cleanup error details: ${JSON.stringify({
                    maxAgeMinutes,
                    cutoffTime: cutoffTime.toISOString(),
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                })}`,
                loggerCtx,
            );
            
            throw error;
        }
    }

    /**
     * One-time migration to clean up all AddingItems orders (for pre-local-cart migration cleanup)
     */
    async cleanupAllAddingItemsOrders(): Promise<number> {
        Logger.info('Starting one-time cleanup of all AddingItems orders (pre-migration cleanup)', loggerCtx);
        
        try {
            // Create admin RequestContext for order operations
            const defaultChannel = await this.channelService.getDefaultChannel();
            const ctx = new RequestContext({
                apiType: 'admin',
                authorizedAsOwnerOnly: false,
                isAuthorized: true,
                channel: defaultChannel,
            });

            let page = 0;
            let totalCancelled = 0;
            let moreOrders = true;

            while (moreOrders) {
                // Find ALL orders in AddingItems state (no age filter)
                const { items: addingItemsOrders } = await this.orderService.findAll(ctx, {
                    filter: {
                        state: { eq: 'AddingItems' },
                    },
                    take: this.BATCH_SIZE,
                    skip: page * this.BATCH_SIZE,
                });
                
                moreOrders = addingItemsOrders.length > 0;
                
                if (addingItemsOrders.length === 0) {
                    if (page === 0) {
                        Logger.info('No AddingItems orders found to clean up', loggerCtx);
                    }
                    break;
                }
                
                Logger.info(
                    `Processing migration batch ${page + 1}: Found ${addingItemsOrders.length} AddingItems orders`,
                    loggerCtx,
                );
                
                let batchCancelled = 0;
                
                for (const order of addingItemsOrders) {
                    try {
                        // Use proper Vendure state transition
                        const result = await this.orderService.transitionToState(ctx, order.id, 'Cancelled');
                        
                        if (result instanceof Order) {
                            batchCancelled++;
                            totalCancelled++;
                            Logger.verbose(
                                `Cancelled pre-migration order ${order.code} (ID: ${order.id}, age: ${this.getOrderAge(order.updatedAt)} minutes)`,
                                loggerCtx,
                            );
                        } else {
                            Logger.warn(
                                `Failed to transition pre-migration order ${order.code} to Cancelled state: ${result.message}`,
                                loggerCtx,
                            );
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                        Logger.error(
                            `Failed to cancel pre-migration order ${order.code}: ${errorMessage}`,
                            loggerCtx,
                        );
                    }
                }
                
                Logger.info(
                    `Migration batch ${page + 1} completed: cancelled ${batchCancelled}/${addingItemsOrders.length} orders`,
                    loggerCtx,
                );
                
                page++;
                
                // Safety limit
                if (page > this.MAX_PAGES) {
                    Logger.warn(
                        `Reached maximum pagination limit (${this.MAX_PAGES} pages) during migration. Stopping cleanup. Total cancelled: ${totalCancelled}`,
                        loggerCtx,
                    );
                    break;
                }
            }
            
            Logger.info(
                `Migration cleanup completed: cancelled ${totalCancelled} pre-migration AddingItems orders across ${page} batches`,
                loggerCtx,
            );
            
            return totalCancelled;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(
                `Error during migration cleanup: ${errorMessage}`,
                loggerCtx,
            );
            throw error;
        }
    }

    /**
     * Delete cancelled orders that have no refunds and are older than the configured age
     * This helps keep the database clean by removing orders that are safe to delete
     * @param minAgeDays Optional override for minimum age in days (default: uses configured value)
     */
    private async deleteCancelledOrdersWithoutRefunds(minAgeDays?: number): Promise<number> {
        const ageLimit = minAgeDays || this.CANCELLED_ORDER_MIN_AGE_DAYS;
        const cutoffTime = new Date(Date.now() - ageLimit * 24 * 60 * 60 * 1000);

        Logger.debug(
            `Starting cancelled order deletion with cutoff time: ${cutoffTime.toISOString()} (${ageLimit} days ago)`,
            loggerCtx,
        );

        try {
            // First, find orders to delete (excluding orders with refunds)
            const ordersToDeleteResult = await this.connection.rawConnection.query(`
                SELECT o.id FROM "order" o
                WHERE o.state = 'Cancelled'
                AND o."updatedAt" < $1
                AND o.id NOT IN (
                    SELECT DISTINCT p."orderId"
                    FROM payment p
                    INNER JOIN refund r ON r."paymentId" = p.id
                    WHERE p."orderId" IS NOT NULL
                );
            `, [cutoffTime]);

            const ordersToDeleteCount = ordersToDeleteResult.length;

            if (ordersToDeleteCount === 0) {
                Logger.verbose('No cancelled orders without refunds found to delete', loggerCtx);
                return 0;
            }

            Logger.info(
                `Found ${ordersToDeleteCount} cancelled orders without refunds to delete (older than ${ageLimit} days)`,
                loggerCtx,
            );

            // Extract order IDs for deletion
            const orderIds = ordersToDeleteResult.map((row: any) => row.id);

            // Execute the deletion in the correct order using transactions
            await this.connection.rawConnection.query('BEGIN');

            try {
                // Delete stock movements (references order_line.id)
                await this.connection.rawConnection.query(`
                    DELETE FROM stock_movement
                    WHERE "orderLineId" IN (
                        SELECT ol.id FROM order_line ol
                        WHERE ol."orderId" = ANY($1)
                    )
                `, [orderIds]);

                // Delete history entries
                await this.connection.rawConnection.query(`
                    DELETE FROM history_entry WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete order channel relationships
                await this.connection.rawConnection.query(`
                    DELETE FROM order_channels_channel WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete order fulfillment relationships
                await this.connection.rawConnection.query(`
                    DELETE FROM order_fulfillments_fulfillment WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete order lines
                await this.connection.rawConnection.query(`
                    DELETE FROM order_line WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete order modifications
                await this.connection.rawConnection.query(`
                    DELETE FROM order_modification WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete order promotion relationships
                await this.connection.rawConnection.query(`
                    DELETE FROM order_promotions_promotion WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete payments (safe since we excluded orders with refunds)
                await this.connection.rawConnection.query(`
                    DELETE FROM payment WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete shipping lines
                await this.connection.rawConnection.query(`
                    DELETE FROM shipping_line WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Delete surcharges
                await this.connection.rawConnection.query(`
                    DELETE FROM surcharge WHERE "orderId" = ANY($1)
                `, [orderIds]);

                // Update sessions to remove references (set to NULL, don't delete sessions)
                await this.connection.rawConnection.query(`
                    UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" = ANY($1)
                `, [orderIds]);

                // Update self-referencing orders (set aggregateOrderId to NULL)
                await this.connection.rawConnection.query(`
                    UPDATE "order" SET "aggregateOrderId" = NULL WHERE "aggregateOrderId" = ANY($1)
                `, [orderIds]);

                // Finally, delete the orders themselves
                await this.connection.rawConnection.query(`
                    DELETE FROM "order" WHERE id = ANY($1)
                `, [orderIds]);

                await this.connection.rawConnection.query('COMMIT');
            } catch (deleteError) {
                await this.connection.rawConnection.query('ROLLBACK');
                throw deleteError;
            }

            Logger.info(
                `Successfully deleted ${ordersToDeleteCount} cancelled orders without refunds`,
                loggerCtx,
            );

            return ordersToDeleteCount;
        } catch (error) {
            // Rollback on error (if not already rolled back)
            try {
                await this.connection.rawConnection.query('ROLLBACK');
            } catch (_rollbackError) {
                // Rollback may have already been called, ignore this error
                Logger.verbose('Rollback already completed or failed', loggerCtx);
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(
                `Error during cancelled order deletion: ${errorMessage}`,
                loggerCtx,
            );

            Logger.verbose(
                `Cancelled order deletion error details: ${JSON.stringify({
                    cutoffTime: cutoffTime.toISOString(),
                    minAgeDays: ageLimit,
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                })}`,
                loggerCtx,
            );

            return 0; // Return 0 to indicate no orders were deleted
        }
    }

    /**
     * Cancel order through intermediate states when direct cancellation fails
     * This uses proper Vendure state transitions to respect the order state machine
     */
    private async cancelOrderThroughIntermediateStates(ctx: RequestContext, order: any): Promise<boolean> {
        try {
            // For PaymentAuthorized orders, try different transition paths
            if (order.state === 'PaymentAuthorized') {
                // Try path 1: PaymentAuthorized -> PaymentSettled -> Cancelled
                Logger.verbose(
                    `Attempting PaymentAuthorized -> PaymentSettled -> Cancelled for order ${order.code}`,
                    loggerCtx,
                );

                const settledResult = await this.orderService.transitionToState(ctx, order.id, 'PaymentSettled');

                if (settledResult instanceof Order) {
                    Logger.verbose(
                        `Successfully transitioned order ${order.code} to PaymentSettled`,
                        loggerCtx,
                    );

                    // Step 2: PaymentSettled -> Cancelled
                    const cancelResult = await this.orderService.transitionToState(ctx, order.id, 'Cancelled');

                    if (cancelResult instanceof Order) {
                        Logger.verbose(
                            `Successfully transitioned order ${order.code} to Cancelled`,
                            loggerCtx,
                        );
                        return true;
                    } else {
                        Logger.warn(
                            `Failed to transition order ${order.code} from PaymentSettled to Cancelled: ${cancelResult.message}`,
                            loggerCtx,
                        );
                    }
                } else {
                    Logger.warn(
                        `Failed to transition order ${order.code} from PaymentAuthorized to PaymentSettled: ${settledResult.message}`,
                        loggerCtx,
                    );

                    // Try path 2: PaymentAuthorized -> ArrangingPayment -> Cancelled
                    Logger.verbose(
                        `Attempting fallback: PaymentAuthorized -> ArrangingPayment -> Cancelled for order ${order.code}`,
                        loggerCtx,
                    );

                    const arrangingResult = await this.orderService.transitionToState(ctx, order.id, 'ArrangingPayment');

                    if (arrangingResult instanceof Order) {
                        Logger.verbose(
                            `Successfully transitioned order ${order.code} to ArrangingPayment`,
                            loggerCtx,
                        );

                        const cancelResult2 = await this.orderService.transitionToState(ctx, order.id, 'Cancelled');

                        if (cancelResult2 instanceof Order) {
                            Logger.verbose(
                                `Successfully transitioned order ${order.code} to Cancelled via ArrangingPayment`,
                                loggerCtx,
                            );
                            return true;
                        } else {
                            Logger.warn(
                                `Failed to transition order ${order.code} from ArrangingPayment to Cancelled: ${cancelResult2.message}`,
                                loggerCtx,
                            );
                        }
                    } else {
                        Logger.warn(
                            `Failed to transition order ${order.code} from PaymentAuthorized to ArrangingPayment: ${arrangingResult.message}`,
                            loggerCtx,
                        );
                    }
                }
            }

            // For other states, we might need different transition paths
            // This can be extended as needed for other problematic states

            // If all proper state transitions fail, use direct database update as last resort
            // This is specifically for cleanup of truly stuck orders that can't be transitioned normally
            Logger.warn(
                `All state transitions failed for order ${order.code}. Using direct database update for cleanup as last resort.`,
                loggerCtx,
            );

            return await this.forceOrderCancellation(order.id, order.code, order.state);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(
                `Failed to cancel order ${order.code} through intermediate states: ${errorMessage}`,
                loggerCtx,
            );
            return false;
        }
    }

    /**
     * Force order cancellation using direct database update as last resort
     * This is ONLY used when all proper Vendure state transitions fail
     * Specifically for cleanup of truly stuck orders (like PaymentAuthorized) that cannot be transitioned normally
     */
    private async forceOrderCancellation(orderId: string | number, orderCode: string, fromState: string): Promise<boolean> {
        try {
            Logger.warn(
                `Using direct database update to cancel stuck order ${orderCode} (state: ${fromState}) - this bypasses Vendure state machine validation`,
                loggerCtx,
            );

            // Use direct database update to set order state to Cancelled
            await this.connection.rawConnection.query(`
                UPDATE "order"
                SET state = 'Cancelled', "updatedAt" = NOW()
                WHERE id = $1
            `, [orderId]);

            // Create a history entry for the transition (for audit trail)
            await this.connection.rawConnection.query(`
                INSERT INTO history_entry (
                    "createdAt",
                    "updatedAt",
                    "type",
                    "isPublic",
                    "data",
                    "discriminator",
                    "orderId"
                )
                VALUES (
                    NOW(),
                    NOW(),
                    'ORDER_STATE_TRANSITION',
                    true,
                    $1,
                    'order-history-entry',
                    $2
                )
            `, [
                JSON.stringify({
                    from: fromState,
                    to: 'Cancelled',
                    note: 'Force-cancelled by stale order cleanup service (state machine transitions failed)'
                }),
                orderId
            ]);

            Logger.warn(
                `Force-cancelled stuck order ${orderCode} (ID: ${orderId}) using direct database update`,
                loggerCtx,
            );

            return true;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(
                `Failed to force-cancel order ${orderCode} (ID: ${orderId}): ${errorMessage}`,
                loggerCtx,
            );
            return false;
        }
    }

    /**
     * Calculate the age of an order in minutes
     */
    private getOrderAge(updatedAt: Date): number {
        return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60));
    }
}
