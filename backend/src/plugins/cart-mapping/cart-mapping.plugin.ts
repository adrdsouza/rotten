import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { CartMappingService } from '../../services/cart-mapping.service';
import { CartOrderMapping } from '../../entities/cart-order-mapping.entity';
import { CartMappingResolver } from './cart-mapping.resolver';
import gql from 'graphql-tag';

@VendurePlugin({
    imports: [PluginCommonModule],
    entities: [CartOrderMapping],
    providers: [CartMappingService],
    shopApiExtensions: {
        resolvers: [CartMappingResolver],
        schema: gql`
            type CartOrderMapping {
                id: ID!
                cartUuid: String!
                orderId: String!
                orderCode: String!
                paymentIntentId: String
                createdAt: DateTime!
                completedAt: DateTime
            }

            extend type Mutation {
                createCartMapping(
                    cartUuid: String!
                    orderId: String!
                    orderCode: String!
                    paymentIntentId: String
                ): CartOrderMapping!

                updateCartMappingPaymentIntent(
                    cartUuid: String!
                    paymentIntentId: String!
                ): CartOrderMapping

                markCartMappingCompleted(cartUuid: String!): CartOrderMapping
            }

            extend type Query {
                getCartMapping(cartUuid: String!): CartOrderMapping
                getCartMappingByOrderCode(orderCode: String!): CartOrderMapping
            }
        `,
    },
})
export class CartMappingPlugin {}