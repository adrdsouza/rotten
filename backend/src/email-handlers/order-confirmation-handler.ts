import { EmailEventListener } from '@vendure/email-plugin';
import {
    OrderStateTransitionEvent,
    OrderService,
    EntityHydrator,
    Injector,
    Order
} from '@vendure/core';

/**
 * Custom order confirmation handler that loads product and shipping data for email templates
 */
export const orderConfirmationHandler = new EmailEventListener('order-confirmation')
    .on(OrderStateTransitionEvent)
    .filter(event =>
        event.toState === 'PaymentSettled' &&
        event.fromState !== 'Modifying' &&
        !!event.order.customer
    )
    .loadData(async ({ event, injector }: { event: OrderStateTransitionEvent; injector: Injector }) => {
        const orderService = injector.get(OrderService);
        const entityHydrator = injector.get(EntityHydrator);

        // Load the order with necessary relations
        const order = await orderService.findOne(event.ctx, event.order.id, [
            'lines',
            'lines.productVariant',
            'lines.productVariant.product',
            'lines.productVariant.product.translations',
            'shippingLines',
            'shippingLines.shippingMethod',
        ]);

        if (order) {
            // Hydrate shippingLines.shippingMethod if needed
            if (order.shippingLines) {
                for (const line of order.shippingLines) {
                    await entityHydrator.hydrate(event.ctx, line, {
                        relations: ['shippingMethod'],
                    });
                }
            }

            return {
                order,
                shippingLines: order.shippingLines || [],
            };
        }

        // Fallback if full order is not found
        return {
            order: event.order,
            shippingLines: [],
        };
    })
    .setRecipient(event => event.order.customer!.emailAddress)
    .setFrom('"Rotten Hand" <sales@rottenhand.com>')
    .setSubject('Order confirmation for #{{ order.code }}')
    .setTemplateVars(event => ({
        order: event.data.order,
        shippingLines: event.data.shippingLines,
    }));
