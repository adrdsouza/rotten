import { Injectable, Logger } from '@nestjs/common';
import { 
  TransactionalConnection, 
  OrderService, 
  Order, 
  OrderState,
  RequestContext,
  RequestContextService
} from '@vendure/core';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';

export interface OrderStateUpdateResult {
  success: boolean;
  previousState?: string;
  newState?: string;
  error?: string;
}

export interface PaymentFailureInfo {
  paymentIntentId: string;
  orderCode: string;
  failureReason: string;
  failureType: 'stripe_error' | 'validation_error' | 'system_error' | 'user_error';
  isRetryable: boolean;
  timestamp: Date;
}

/**
 * Service for managing order states during payment failures and recoveries
 */
@Injectable()
export class StripeOrderStateManagerService {
  private readonly logger = new Logger(StripeOrderStateManagerService.name);

  constructor(
    private connection: TransactionalConnection,
    private orderService: OrderService,
    private requestContextService: RequestContextService
  ) {}

  /**
   * Handle payment failure by updating order state appropriately
   */
  async handlePaymentFailure(
    paymentIntentId: string,
    failureInfo: PaymentFailureInfo,
    context: RequestContext
  ): Promise<OrderStateUpdateResult> {
    this.logger.log(`Handling payment failure for PaymentIntent ${paymentIntentId}`);

    return await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
      try {
        // Get the pending payment record
        const pendingPayment = await transactionalEntityManager.findOne(PendingStripePayment, {
          where: { paymentIntentId }
        });

        if (!pendingPayment) {
          return {
            success: false,
            error: 'Pending payment record not found'
          };
        }

        // Get the order
        const order = await this.orderService.findOneByCode(context, pendingPayment.orderCode);
        if (!order) {
          return {
            success: false,
            error: 'Order not found'
          };
        }

        const previousState = order.state;

        // Update pending payment status
        await transactionalEntityManager.update(PendingStripePayment, 
          { paymentIntentId }, 
          { 
            status: 'failed',
            failureReason: failureInfo.failureReason,
            failureType: failureInfo.failureType,
            isRetryable: failureInfo.isRetryable,
            failedAt: failureInfo.timestamp
          }
        );

        // Determine appropriate order state based on failure type
        let targetState: string;
        
        if (failureInfo.isRetryable && 
            (failureInfo.failureType === 'stripe_error' || failureInfo.failureType === 'system_error')) {
          // Keep order in ArrangingPayment for retryable errors
          targetState = 'ArrangingPayment';
        } else if (failureInfo.failureType === 'user_error' || 
                   failureInfo.failureType === 'validation_error') {
          // Move to PaymentDeclined for user/validation errors
          targetState = 'PaymentDeclined';
        } else {
          // Move to PaymentDeclined for non-retryable errors
          targetState = 'PaymentDeclined';
        }

        // Update order state if needed
        if (order.state !== targetState) {
          try {
            const updatedOrder = await this.transitionOrderState(order, targetState, context);
            
            this.logger.log(
              `Order ${order.code} state updated from ${previousState} to ${updatedOrder.state} ` +
              `due to payment failure: ${failureInfo.failureReason}`
            );

            return {
              success: true,
              previousState,
              newState: updatedOrder.state
            };
          } catch (transitionError) {
            this.logger.error(
              `Failed to transition order ${order.code} to ${targetState}: ${transitionError.message}`
            );
            
            // Even if state transition fails, we still updated the payment record
            return {
              success: true,
              previousState,
              newState: previousState,
              error: `Payment marked as failed but order state transition failed: ${transitionError.message}`
            };
          }
        }

        return {
          success: true,
          previousState,
          newState: order.state
        };

      } catch (error) {
        this.logger.error(`Error handling payment failure for ${paymentIntentId}: ${error.message}`, error.stack);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Handle successful payment by ensuring order is in correct state
   */
  async handlePaymentSuccess(
    paymentIntentId: string,
    context: RequestContext
  ): Promise<OrderStateUpdateResult> {
    this.logger.log(`Handling payment success for PaymentIntent ${paymentIntentId}`);

    try {
      // Get the pending payment record
      const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
        where: { paymentIntentId }
      });

      if (!pendingPayment) {
        return {
          success: false,
          error: 'Pending payment record not found'
        };
      }

      // Get the order
      const order = await this.orderService.findOneByCode(context, pendingPayment.orderCode);
      if (!order) {
        return {
          success: false,
          error: 'Order not found'
        };
      }

      const previousState = order.state;

      // For successful payments, order should typically be in PaymentSettled state
      // This is usually handled by Vendure's payment service, but we can verify
      if (order.state === 'PaymentSettled') {
        return {
          success: true,
          previousState,
          newState: order.state
        };
      }

      this.logger.log(
        `Payment succeeded for order ${order.code} but order is in state ${order.state}. ` +
        `This may be expected depending on the payment flow.`
      );

      return {
        success: true,
        previousState,
        newState: order.state
      };

    } catch (error) {
      this.logger.error(`Error handling payment success for ${paymentIntentId}: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Reset order state for payment retry
   */
  async resetOrderForRetry(
    paymentIntentId: string,
    context: RequestContext
  ): Promise<OrderStateUpdateResult> {
    this.logger.log(`Resetting order for payment retry: ${paymentIntentId}`);

    return await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
      try {
        // Get the pending payment record
        const pendingPayment = await transactionalEntityManager.findOne(PendingStripePayment, {
          where: { paymentIntentId }
        });

        if (!pendingPayment) {
          return {
            success: false,
            error: 'Pending payment record not found'
          };
        }

        // Get the order
        const order = await this.orderService.findOneByCode(context, pendingPayment.orderCode);
        if (!order) {
          return {
            success: false,
            error: 'Order not found'
          };
        }

        const previousState = order.state;

        // Reset pending payment status
        await transactionalEntityManager.update(PendingStripePayment, 
          { paymentIntentId }, 
          { 
            status: 'pending',
            failureReason: null,
            failureType: null,
            isRetryable: null,
            failedAt: null,
            retryCount: () => 'COALESCE(retry_count, 0) + 1'
          }
        );

        // Ensure order is in ArrangingPayment state for retry
        if (order.state !== 'ArrangingPayment') {
          try {
            const updatedOrder = await this.transitionOrderState(order, 'ArrangingPayment', context);
            
            this.logger.log(
              `Order ${order.code} state reset from ${previousState} to ${updatedOrder.state} for payment retry`
            );

            return {
              success: true,
              previousState,
              newState: updatedOrder.state
            };
          } catch (transitionError) {
            this.logger.error(
              `Failed to reset order ${order.code} state for retry: ${transitionError.message}`
            );
            
            return {
              success: false,
              error: `Failed to reset order state: ${transitionError.message}`
            };
          }
        }

        return {
          success: true,
          previousState,
          newState: order.state
        };

      } catch (error) {
        this.logger.error(`Error resetting order for retry ${paymentIntentId}: ${error.message}`, error.stack);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Get order state information for a payment
   */
  async getOrderStateInfo(paymentIntentId: string, context: RequestContext): Promise<{
    orderCode?: string;
    orderState?: string;
    paymentStatus?: string;
    canRetry?: boolean;
    error?: string;
  }> {
    try {
      const pendingPayment = await this.connection.getRepository(PendingStripePayment).findOne({
        where: { paymentIntentId }
      });

      if (!pendingPayment) {
        return { error: 'Payment not found' };
      }

      const order = await this.orderService.findOneByCode(context, pendingPayment.orderCode);
      if (!order) {
        return { 
          orderCode: pendingPayment.orderCode,
          paymentStatus: pendingPayment.status,
          error: 'Order not found' 
        };
      }

      const canRetry = pendingPayment.status === 'failed' && 
                      pendingPayment.isRetryable && 
                      (pendingPayment.retryCount || 0) < 3;

      return {
        orderCode: order.code,
        orderState: order.state,
        paymentStatus: pendingPayment.status,
        canRetry
      };

    } catch (error) {
      this.logger.error(`Error getting order state info for ${paymentIntentId}: ${error.message}`, error.stack);
      return { error: error.message };
    }
  }

  /**
   * Transition order to target state
   */
  private async transitionOrderState(
    order: Order, 
    targetState: string, 
    context: RequestContext
  ): Promise<Order> {
    // Get available transitions for the order
    const nextStates = await this.orderService.getNextOrderStates(context, order);
    
    if (!nextStates.includes(targetState as OrderState)) {
      throw new Error(
        `Cannot transition order ${order.code} from ${order.state} to ${targetState}. ` +
        `Available transitions: ${nextStates.join(', ')}`
      );
    }

    // Perform the transition
    const result = await this.orderService.transitionToState(context, order.id, targetState as OrderState);
    
    if (result.__typename === 'Order') {
      return result;
    } else {
      throw new Error(`Order transition failed: ${JSON.stringify(result)}`);
    }
  }

  /**
   * Clean up old failed payments (for maintenance)
   */
  async cleanupOldFailedPayments(olderThanDays: number = 30): Promise<{
    cleaned: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.connection.getRepository(PendingStripePayment)
        .createQueryBuilder()
        .delete()
        .where('status = :status', { status: 'failed' })
        .andWhere('failed_at < :cutoffDate', { cutoffDate })
        .andWhere('is_retryable = :isRetryable', { isRetryable: false })
        .execute();

      this.logger.log(`Cleaned up ${result.affected} old failed payments older than ${olderThanDays} days`);

      return { cleaned: result.affected || 0 };

    } catch (error) {
      this.logger.error(`Error cleaning up old failed payments: ${error.message}`, error.stack);
      return { cleaned: 0, error: error.message };
    }
  }
}