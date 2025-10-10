import {
  VendurePlugin,
  PluginCommonModule,
  Logger,
} from '@vendure/core';
import { gql } from 'graphql-tag';

import { OrderTrackingService } from './services/order-tracking.service.js';
import { OrderTrackingResolver } from './resolvers/order-tracking.resolver.js';

/**
 * Order Tracking Plugin
 * 
 * This plugin provides secure order tracking functionality for guest customers
 * beyond Vendure's default 2-hour window. It allows customers to track their
 * orders by providing their order code and email address.
 * 
 * Features:
 * - Secure order lookup with email verification
 * - Rate limiting protection
 * - Comprehensive order details (status, items, tracking, shipping)
 * - Guest-friendly tracking without requiring authentication
 */
@VendurePlugin({
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [OrderTrackingService],
  shopApiExtensions: {
    schema: gql`
      extend type Query {
        trackOrder(orderCode: String!, email: String!): OrderTrackingResult!
      }
      
      type OrderTrackingResult {
        order: Order
        error: String
        success: Boolean!
      }

    `,
    resolvers: [OrderTrackingResolver],
  },
})
export class OrderTrackingPlugin {
  private static readonly loggerCtx = 'OrderTrackingPlugin';

  static init(): typeof OrderTrackingPlugin {
    return OrderTrackingPlugin;
  }

  async onApplicationBootstrap() {
    Logger.info('OrderTrackingPlugin initialized successfully', OrderTrackingPlugin.loggerCtx);
  }

  async onApplicationShutdown() {
    Logger.info('OrderTrackingPlugin shutting down', OrderTrackingPlugin.loggerCtx);
  }
}