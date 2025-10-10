import { EmailEventListener } from '@vendure/email-plugin';
import { OrderStateTransitionEvent, OrderService } from '@vendure/core';

/**
 * Email handler for sending order fulfillment notifications with tracking information
 */
export const orderFulfillmentHandler = new EmailEventListener('order-fulfillment')
    .on(OrderStateTransitionEvent)
    .filter(event => 
        (event.toState === 'Shipped' || event.toState === 'PartiallyShipped' || event.toState === 'Delivered') && 
        !!event.order.customer &&
        !!event.order.customer.emailAddress
    )
    .loadData(async ({ event, injector }) => {
        const orderService = injector.get(OrderService);
        
        try {
            // Get the full order with fulfillments relation
            const orderWithFulfillments = await orderService.findOne(
                event.ctx, 
                event.order.id, 
                ['fulfillments']
            );
            
            if (!orderWithFulfillments || !orderWithFulfillments.fulfillments) {
                return {
                    fulfillments: [],
                    hasTracking: false
                };
            }
            
            // Extract tracking information from fulfillments
            const trackingInfo = orderWithFulfillments.fulfillments
                .map((fulfillment: any) => ({
                    id: fulfillment.id,
                    trackingCode: fulfillment.trackingCode,
                    method: fulfillment.method,
                    createdAt: fulfillment.createdAt,
                    state: fulfillment.state
                }))
                .filter((f: any) => f.trackingCode); // Only include fulfillments with tracking codes
            
            return {
                fulfillments: trackingInfo,
                hasTracking: trackingInfo.length > 0
            };
        } catch (error) {
            console.error('Error loading fulfillment data:', error);
            return {
                fulfillments: [],
                hasTracking: false
            };
        }
    })
    .setRecipient(event => event.order.customer!.emailAddress)
    .setFrom('{{ fromAddress }}')
    .setSubject('Your order #{{ order.code }} has shipped!')
    .setTemplateVars(event => ({
        order: event.order,
        customer: event.order.customer,
        fulfillments: event.data.fulfillments,
        hasTracking: event.data.hasTracking,
        primaryTracking: event.data.fulfillments[0]?.trackingCode || null
    }));
