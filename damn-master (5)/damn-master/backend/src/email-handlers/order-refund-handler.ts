import { EmailEventListener } from '@vendure/email-plugin';
import {
    RefundStateTransitionEvent,
    OrderService,
    EntityHydrator,
    Injector,
    Logger
} from '@vendure/core';

/**
 * Email handler for sending refund confirmation notifications to customers
 */
export const orderRefundHandler = new EmailEventListener('order-refund')
    .on(RefundStateTransitionEvent)
    .filter(event => 
        event.toState === 'Settled' && 
        !!event.refund.payment?.order?.customer?.emailAddress
    )
    .loadData(async ({ event, injector }: { event: RefundStateTransitionEvent; injector: Injector }) => {
        const orderService = injector.get(OrderService);
        const entityHydrator = injector.get(EntityHydrator);

        try {
            // Load the order with necessary relations
            const order = await orderService.findOne(event.ctx, event.refund.payment.order.id, [
                'lines',
                'lines.productVariant',
                'lines.productVariant.product',
                'lines.productVariant.product.translations',
                'customer',
                'payments',
                'payments.refunds'
            ]);

            if (order) {
                // Hydrate product variants to ensure custom fields are loaded
                if (order.lines) {
                    for (const line of order.lines) {
                        if (line.productVariant) {
                            await entityHydrator.hydrate(event.ctx, line.productVariant, {
                                relations: ['product'],
                            });
                        }
                    }
                }

                // Calculate refund details
                const refundAmount = event.refund.total;
                const refundReason = event.refund.reason || 'Refund processed';
                const refundDate = event.refund.createdAt;

                // Get payment method information
                const payment = event.refund.payment;
                const paymentMethod = payment?.method || 'Unknown';

                Logger.info(
                    `Sending refund confirmation email for order ${order.code}, refund amount: ${refundAmount}`,
                    'OrderRefundHandler'
                );

                return {
                    order,
                    refund: {
                        id: event.refund.id,
                        total: refundAmount,
                        reason: refundReason,
                        createdAt: refundDate,
                        transactionId: event.refund.transactionId
                    },
                    payment: {
                        method: paymentMethod,
                        transactionId: payment?.transactionId
                    }
                };
            }

            Logger.warn(
                `Could not load order data for refund ${event.refund.id}`,
                'OrderRefundHandler'
            );

            // Fallback data if order cannot be loaded
            return {
                order: event.refund.payment.order,
                refund: {
                    id: event.refund.id,
                    total: event.refund.total,
                    reason: event.refund.reason || 'Refund processed',
                    createdAt: event.refund.createdAt,
                    transactionId: event.refund.transactionId
                },
                payment: {
                    method: event.refund.payment.method || 'Unknown',
                    transactionId: event.refund.payment.transactionId
                }
            };

        } catch (error) {
            Logger.error(
                `Error loading refund data for order ${event.refund.payment.order.id}: ${error}`,
                'OrderRefundHandler'
            );

            // Return minimal data on error
            return {
                order: event.refund.payment.order,
                refund: {
                    id: event.refund.id,
                    total: event.refund.total,
                    reason: event.refund.reason || 'Refund processed',
                    createdAt: event.refund.createdAt,
                    transactionId: event.refund.transactionId
                },
                payment: {
                    method: event.refund.payment.method || 'Unknown',
                    transactionId: event.refund.payment.transactionId
                }
            };
        }
    })
    .setRecipient(event => event.refund.payment.order.customer!.emailAddress)
    .setFrom('"Damned Designs" <sales@damneddesigns.com>')
    .setSubject('Refund confirmation for order #{{ order.code }}')
    .setTemplateVars(event => ({
        order: event.data.order,
        refund: event.data.refund,
        payment: event.data.payment,
        customer: event.data.order.customer
    }));