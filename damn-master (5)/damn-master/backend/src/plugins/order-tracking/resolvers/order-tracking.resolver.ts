import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, Logger } from '@vendure/core';
import { OrderTrackingService, OrderTrackingResult } from '../services/order-tracking.service.js';

@Resolver()
export class OrderTrackingResolver {
  constructor(private orderTrackingService: OrderTrackingService) {}

  @Query()
  async trackOrder(
    @Ctx() ctx: RequestContext,
    @Args('orderCode') orderCode: string,
    @Args('email') email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Log the tracking attempt (without exposing sensitive data in logs)
      Logger.debug(
        `Order tracking attempt for order: ${orderCode}`,
        'OrderTrackingResolver'
      );

      const result = await this.orderTrackingService.trackOrder(ctx, orderCode, email);
      
      // Log successful result (without exposing order details in logs)
      if (result.success) {
        Logger.debug(
          `Successful order tracking for order: ${orderCode}`,
          'OrderTrackingResolver'
        );
      } else {
        Logger.debug(
          `Failed order tracking for order: ${orderCode} - ${result.error}`,
          'OrderTrackingResolver'
        );
      }

      return result;
    } catch (error) {
      Logger.error(
        `Error in trackOrder resolver: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingResolver'
      );
      
      return {
        success: false,
        error: 'Unable to process tracking request at this time.',
      };
    }
  }


}