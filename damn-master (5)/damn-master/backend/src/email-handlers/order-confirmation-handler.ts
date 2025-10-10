import { EmailEventListener } from '@vendure/email-plugin';
import {
    OrderStateTransitionEvent,
    OrderService,
    EntityHydrator,
    Injector
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

            // Hydrate shippingLines.shippingMethod if needed
            if (order.shippingLines) {
                for (const line of order.shippingLines) {
                    await entityHydrator.hydrate(event.ctx, line, {
                        relations: ['shippingMethod'],
                    });
                }
            }

            // Create a serializable order object to avoid taxSummary access issues in job queue
            const serializableOrder = {
                id: order.id,
                code: order.code,
                state: order.state,
                orderPlacedAt: order.orderPlacedAt,
                currencyCode: order.currencyCode,
                subTotal: order.subTotal,
                subTotalWithTax: order.subTotalWithTax,
                shipping: order.shipping,
                shippingWithTax: order.shippingWithTax,
                total: order.total,
                totalWithTax: order.totalWithTax,
                customer: order.customer,
                lines: order.lines,
                shippingLines: order.shippingLines,
                discounts: order.discounts,
            };

            return {
                order: serializableOrder,
                shippingLines: order.shippingLines || [],
            };
        }

        // Fallback if full order is not found - create serializable order object
        const fallbackOrder = {
            id: event.order.id,
            code: event.order.code,
            state: event.order.state,
            orderPlacedAt: event.order.orderPlacedAt,
            currencyCode: event.order.currencyCode,
            subTotal: event.order.subTotal,
            subTotalWithTax: event.order.subTotalWithTax,
            shipping: event.order.shipping,
            shippingWithTax: event.order.shippingWithTax,
            total: event.order.total,
            totalWithTax: event.order.totalWithTax,
            customer: event.order.customer,
            lines: event.order.lines || [],
            shippingLines: event.order.shippingLines || [],
            discounts: event.order.discounts || [],
        };

        return {
            order: fallbackOrder,
            shippingLines: [],
        };
    })
    .setRecipient(event => event.order.customer!.emailAddress)
    .setFrom('"Damned Designs" <sales@damneddesigns.com>')
    .setSubject('Order confirmation for #{{ order.code }}')
    .setTemplateVars(event => ({
        order: event.data.order,
        shippingLines: event.data.shippingLines,
    }));
