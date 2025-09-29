import { Injectable, Logger } from '@nestjs/common';
import { 
  TransactionalConnection, 
  OrderService, 
  PaymentService,
  RequestContext,
  RequestContextService,
  Order
} from '@vendure/core';
import Stripe from 'stripe';
import { PendingStripePayment } from '../entities/pending-stripe-payment.entity';
import { StripeErrorHandlerService } from './stripe-error-handler.service';
import { StripeOrderStateManagerService } from './stripe-order-state-manager.service';

export interface AdminPaymentInfo {
  paymentIntentId: string;
  orderCode: string;
  amount: number;
  currency: string;
  status: string;
  stripeStatus?: string;
  createdAt: Date;
  settledAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  failureType?: string;
  isRetryable?: boolean;
  retryCount?: number;
  orderState?: string;
  canManualSettle?: boolean;
  canRetry?: boolean;
}

export interface ManualSettlementResult {
  success: boolean;
  paymentId?: string;
  orderCode?: string;
  error?: string;
  warnings?: string[];
}

export interface PaymentSearchFilters {
  status?: 'pending' | 'settled' | 'failed';
  orderCode?: string;
  paymentIntentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isRetryable?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Admin tools for manual payment resolution and monitoring
 */
@Injectable()
export class StripeAdminToolsService {
  private readonly logger = new Logger(StripeAdminToolsService.name);
  private stripe: Stripe | null = null;

  constructor(
    private connection: TransactionalConnection,
    private orderService: OrderService,
    private paymentService: PaymentService,
    private requestContextService: RequestContextService,
    private errorHandler: StripeErrorHandlerService,
    private orderStateManager: StripeOrderStateManagerService
  ) {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey, {
        apiVersion: '2023-08-16',
      });
    }
  }

  /**
   * Search and list payments with filters
   */
  async searchPayments(filters: PaymentSearchFilters = {}): Promise<{
    payments: AdminPaymentInfo[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const limit = Math.min(filters.limit || 50, 100);
      const offset = filters.offset || 0;

      const queryBuilder = this.connection.getRepository(PendingStripePayment)
        .createQueryBuilder('payment');

      // Apply filters
      if (filters.status) {
        queryBuilder.andWhere('payment.status = :status', { status: filters.status });
      }

      if (filters.orderCode) {
        queryBuilder.andWhere('payment.orderCode LIKE :orderCode', { 
          orderCode: `%${filters.orderCode}%` 
        });
      }

      if (filters.paymentIntentId) {
        queryBuilder.andWhere('payment.paymentIntentId LIKE :paymentIntentId', { 
          paymentIntentId: `%${filters.paymentIntentId}%` 
        });
      }

      if (filters.dateFrom) {
        queryBuilder.andWhere('payment.createdAt >= :dateFrom', { dateFrom: filters.dateFrom });
      }

      if (filters.dateTo) {
        queryBuilder.andWhere('payment.createdAt <= :dateTo', { dateTo: filters.dateTo });
      }

      if (filters.isRetryable !== undefined) {
        queryBuilder.andWhere('payment.isRetryable = :isRetryable', { 
          isRetryable: filters.isRetryable 
        });
      }

      // Get total count
      const total = await queryBuilder.getCount();

      // Get paginated results
      const payments = await queryBuilder
        .orderBy('payment.createdAt', 'DESC')
        .limit(limit)
        .offset(offset)
        .getMany();

      // Enrich with additional info
      const enrichedPayments = await Promise.all(
        payments.map(payment => this.enrichPaymentInfo(payment))
      );

      return {
        payments: enrichedPayments,
        total,
        hasMore: offset + limit < total
      };

    } catch (error) {
      this.logger.error(`Error searching payments: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get detailed payment information
   */
  async getPaymentDetails(paymentIntentId: string): Promise<AdminPaymentInfo | null> {
    try {
      const payment = await this.connection.getRepository(PendingStripePayment).findOne({
        where: { paymentIntentId }
      });

      if (!payment) {
        return null;
      }

      return await this.enrichPaymentInfo(payment);

    } catch (error) {
      this.logger.error(`Error getting payment details for ${paymentIntentId}: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Manually settle a payment (admin override)
   */
  async manuallySettlePayment(
    paymentIntentId: string,
    adminContext: RequestContext,
    bypassValidation = false
  ): Promise<ManualSettlementResult> {
    this.logger.warn(`Admin manual settlement initiated for PaymentIntent ${paymentIntentId} by user ${adminContext.activeUserId}`);

    return await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
      try {
        const warnings: string[] = [];

        // Get payment record
        const pendingPayment = await transactionalEntityManager.findOne(PendingStripePayment, {
          where: { paymentIntentId }
        });

        if (!pendingPayment) {
          return {
            success: false,
            error: 'Payment record not found'
          };
        }

        // Check if already settled
        if (pendingPayment.status === 'settled') {
          return {
            success: false,
            error: 'Payment is already settled'
          };
        }

        // Get order
        const order = await this.orderService.findOneByCode(adminContext, pendingPayment.orderCode);
        if (!order) {
          return {
            success: false,
            error: 'Order not found'
          };
        }

        // Verify with Stripe if not bypassing validation
        if (!bypassValidation && this.stripe) {
          try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
            
            if (paymentIntent.status !== 'succeeded') {
              warnings.push(`Stripe PaymentIntent status is '${paymentIntent.status}', not 'succeeded'`);
              
              if (paymentIntent.status === 'canceled' || paymentIntent.status === 'requires_payment_method') {
                return {
                  success: false,
                  error: `Cannot settle payment with Stripe status '${paymentIntent.status}'`
                };
              }
            }

            // Check amount match
            if (Math.abs(paymentIntent.amount - pendingPayment.amount) > 1) {
              warnings.push(
                `Amount mismatch: Stripe has ${paymentIntent.amount}, local record has ${pendingPayment.amount}`
              );
            }

          } catch (stripeError) {
            warnings.push(`Could not verify with Stripe: ${stripeError.message}`);
          }
        }

        // Add payment to order
        const paymentResult = await this.paymentService.addPaymentToOrder(adminContext, order.id, {
          method: 'stripe',
          metadata: {
            paymentIntentId: paymentIntentId,
            manualSettlement: true,
            settledBy: adminContext.activeUserId,
            settledAt: new Date().toISOString(),
            warnings: warnings.length > 0 ? warnings : undefined
          }
        });

        if (paymentResult.__typename === 'Order') {
          // Update payment record
          await transactionalEntityManager.update(PendingStripePayment, 
            { paymentIntentId }, 
            { 
              status: 'settled',
              settledAt: new Date(),
              manualSettlement: true,
              settledBy: adminContext.activeUserId?.toString()
            }
          );

          const paymentId = (paymentResult as Order).payments?.[0]?.id;

          this.logger.warn(
            `Manual settlement completed for PaymentIntent ${paymentIntentId}, ` +
            `Order ${order.code}, Payment ID ${paymentId} by admin ${adminContext.activeUserId}`
          );

          return {
            success: true,
            paymentId,
            orderCode: order.code,
            warnings: warnings.length > 0 ? warnings : undefined
          };

        } else {
          this.logger.error(`Manual settlement failed for ${paymentIntentId}: ${JSON.stringify(paymentResult)}`);
          return {
            success: false,
            error: 'Payment settlement failed in Vendure'
          };
        }

      } catch (error) {
        this.logger.error(`Manual settlement error for ${paymentIntentId}: ${error.message}`, error.stack);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Retry failed payment settlement
   */
  async retryPaymentSettlement(
    paymentIntentId: string,
    adminContext: RequestContext
  ): Promise<ManualSettlementResult> {
    this.logger.log(`Admin retry settlement for PaymentIntent ${paymentIntentId}`);

    try {
      // Reset order state for retry
      const resetResult = await this.orderStateManager.resetOrderForRetry(paymentIntentId, adminContext);
      
      if (!resetResult.success) {
        return {
          success: false,
          error: `Failed to reset order for retry: ${resetResult.error}`
        };
      }

      // Attempt normal settlement (this will go through all validations)
      // Note: This would typically call the main settlement service
      // For now, we'll return success indicating the retry was set up
      return {
        success: true,
        orderCode: resetResult.newState ? 'Order reset for retry' : undefined,
        warnings: ['Payment has been reset for retry. Customer should attempt payment again.']
      };

    } catch (error) {
      this.logger.error(`Retry settlement error for ${paymentIntentId}: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Cancel/void a payment
   */
  async cancelPayment(
    paymentIntentId: string,
    adminContext: RequestContext,
    reason: string
  ): Promise<ManualSettlementResult> {
    this.logger.warn(`Admin canceling PaymentIntent ${paymentIntentId}: ${reason}`);

    return await this.connection.rawConnection.transaction(async (transactionalEntityManager) => {
      try {
        // Update payment record
        await transactionalEntityManager.update(PendingStripePayment, 
          { paymentIntentId }, 
          { 
            status: 'failed',
            failureReason: `Canceled by admin: ${reason}`,
            failureType: 'user_error',
            isRetryable: false,
            failedAt: new Date(),
            canceledBy: adminContext.activeUserId?.toString()
          }
        );

        // Cancel with Stripe if possible
        if (this.stripe) {
          try {
            await this.stripe.paymentIntents.cancel(paymentIntentId);
          } catch (stripeError) {
            this.logger.warn(`Could not cancel PaymentIntent with Stripe: ${stripeError.message}`);
          }
        }

        this.logger.warn(`PaymentIntent ${paymentIntentId} canceled by admin ${adminContext.activeUserId}: ${reason}`);

        return {
          success: true,
          warnings: ['Payment has been canceled']
        };

      } catch (error) {
        this.logger.error(`Cancel payment error for ${paymentIntentId}: ${error.message}`, error.stack);
        return {
          success: false,
          error: error.message
        };
      }
    });
  }

  /**
   * Get payment statistics for admin dashboard
   */
  async getPaymentStatistics(days: number = 30): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    retryableFailures: number;
    manualSettlements: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const queryBuilder = this.connection.getRepository(PendingStripePayment)
        .createQueryBuilder('payment')
        .where('payment.createdAt >= :cutoffDate', { cutoffDate });

      const [
        totalPayments,
        successfulPayments,
        failedPayments,
        pendingPayments,
        retryableFailures,
        manualSettlements,
        amountStats
      ] = await Promise.all([
        queryBuilder.getCount(),
        queryBuilder.clone().andWhere('payment.status = :status', { status: 'settled' }).getCount(),
        queryBuilder.clone().andWhere('payment.status = :status', { status: 'failed' }).getCount(),
        queryBuilder.clone().andWhere('payment.status = :status', { status: 'pending' }).getCount(),
        queryBuilder.clone()
          .andWhere('payment.status = :status', { status: 'failed' })
          .andWhere('payment.isRetryable = :isRetryable', { isRetryable: true })
          .getCount(),
        queryBuilder.clone()
          .andWhere('payment.manualSettlement = :manual', { manual: true })
          .getCount(),
        queryBuilder.clone()
          .select('SUM(payment.amount)', 'total')
          .addSelect('AVG(payment.amount)', 'average')
          .getRawOne()
      ]);

      return {
        totalPayments,
        successfulPayments,
        failedPayments,
        pendingPayments,
        retryableFailures,
        manualSettlements,
        totalAmount: parseFloat(amountStats?.total || '0'),
        averageAmount: parseFloat(amountStats?.average || '0')
      };

    } catch (error) {
      this.logger.error(`Error getting payment statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Enrich payment info with additional details
   */
  private async enrichPaymentInfo(payment: PendingStripePayment): Promise<AdminPaymentInfo> {
    let stripeStatus: string | undefined;
    let orderState: string | undefined;

    // Get Stripe status if available
    if (this.stripe) {
      try {
        const paymentIntent = await this.stripe.paymentIntents.retrieve(payment.paymentIntentId);
        stripeStatus = paymentIntent.status;
      } catch (error) {
        // Ignore Stripe errors for listing
      }
    }

    // Get order state
    try {
      const ctx = await this.requestContextService.create({
        apiType: 'admin'
      });
      
      const order = await this.orderService.findOneByCode(ctx, payment.orderCode);
      orderState = order?.state;
    } catch (error) {
      // Ignore order lookup errors for listing
    }

    const canManualSettle = payment.status !== 'settled' && 
                           (stripeStatus === 'succeeded' || stripeStatus === 'requires_capture');
    
    const canRetry = payment.status === 'failed' && 
                    payment.isRetryable && 
                    (payment.retryCount || 0) < 3;

    return {
      paymentIntentId: payment.paymentIntentId,
      orderCode: payment.orderCode,
      amount: payment.amount,
      currency: payment.currency || 'USD',
      status: payment.status,
      stripeStatus,
      createdAt: payment.createdAt,
      settledAt: payment.settledAt,
      failedAt: payment.failedAt,
      failureReason: payment.failureReason,
      failureType: payment.failureType,
      isRetryable: payment.isRetryable,
      retryCount: payment.retryCount,
      orderState,
      canManualSettle,
      canRetry
    };
  }
}