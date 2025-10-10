import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { Allow, Permission, RequestContext, TransactionalConnection, Logger, PaymentService, Ctx, Order } from '@vendure/core';

@Resolver()
export class SezzleVerificationResolver {
  constructor(
    private connection: TransactionalConnection,
    private paymentService: PaymentService,
  ) {}

  @Mutation()
  @Allow(Permission.Owner)
  async verifySezzlePayment(
    @Ctx() ctx: RequestContext,
    @Args() args: { orderCode: string }
  ): Promise<{ success: boolean; message: string }> {
    try {
      Logger.info(`[Sezzle] Verifying payment for order: ${args.orderCode}`, 'SezzleVerificationResolver');

      // Find the order by code with necessary relations
      const order = await this.connection.getRepository(ctx, Order).findOne({
        where: { code: args.orderCode },
        relations: [
          'payments',
          'lines',
          'lines.productVariant',
          'customer',
          'shippingLines',
          'shippingLines.shippingMethod'
        ],
      });

      if (!order) {
        Logger.error(`[Sezzle] Order not found: ${args.orderCode}`, 'SezzleVerificationResolver');
        return { success: false, message: 'Order not found' };
      }

      // Find the Sezzle payment
      const sezzlePayment = order.payments?.find((p: any) => p.method === 'sezzle' && p.state === 'Authorized');
      
      if (!sezzlePayment) {
        Logger.error(`[Sezzle] No authorized Sezzle payment found for order: ${args.orderCode}`, 'SezzleVerificationResolver');
        return { success: false, message: 'No authorized Sezzle payment found' };
      }

      Logger.info(`[Sezzle] Found Sezzle payment ${sezzlePayment.id} for order ${args.orderCode}`, 'SezzleVerificationResolver');

      // Attempt to settle the payment (this will verify with Sezzle and update status)
      const settlementResult = await this.paymentService.settlePayment(ctx, sezzlePayment.id);
 Logger.info(`[Sezzle] Settlement result1: ${JSON.stringify(settlementResult)}`, 'SezzleVerificationResolver');
    
      // Check if settlement was successful
      // PaymentService.settlePayment() returns: PaymentStateTransitionError | Payment
      // PaymentStateTransitionError has properties like 'errorCode', 'message', 'fromState', 'toState'
      // Payment object (success) has properties like 'id', 'state', 'method', etc.

      if (settlementResult && typeof settlementResult === 'object') {
        // Check if this is a PaymentStateTransitionError (has errorCode property)
        if ('errorCode' in settlementResult) {
          // This is a PaymentStateTransitionError (failure)
          const errorMessage = (settlementResult as any).message || 'Payment settlement failed';
          Logger.error(`[Sezzle] Payment settlement failed for order ${args.orderCode}: ${errorMessage}`, 'SezzleVerificationResolver');
          Logger.error(`[Sezzle] Error details: ${JSON.stringify(settlementResult)}`, 'SezzleVerificationResolver');
          return { success: false, message: errorMessage };
        } else if ('id' in settlementResult && 'state' in settlementResult) {
          // This is a Payment object - check if it's actually completed/captured
          const payment = settlementResult as any;
          const paymentState = payment.state;
          const sezzleStatus = payment.metadata?.sezzleStatus;
          const checkoutStatus = payment.metadata?.checkoutStatus;

          Logger.info(`[Sezzle] Payment settlement response for order ${args.orderCode}:`, 'SezzleVerificationResolver');
          Logger.info(`[Sezzle] - Payment state: ${paymentState}`, 'SezzleVerificationResolver');
          Logger.info(`[Sezzle] - Sezzle status: ${sezzleStatus}`, 'SezzleVerificationResolver');
          Logger.info(`[Sezzle] - Checkout status: ${checkoutStatus}`, 'SezzleVerificationResolver');

          // Only return success if payment is settled AND Sezzle confirms completion
          if (paymentState === 'Settled' && (sezzleStatus === 'COMPLETED' || checkoutStatus === 'completed')) {
            Logger.info(`[Sezzle] Payment verified and settled successfully for order ${args.orderCode}`, 'SezzleVerificationResolver');
            return { success: true, message: 'Payment verified and settled successfully' };
          } else {
            // Payment settlement succeeded but Sezzle status indicates it's not completed
            Logger.warn(`[Sezzle] Payment settled but not completed for order ${args.orderCode}`, 'SezzleVerificationResolver');
            Logger.warn(`[Sezzle] Payment state: ${paymentState}, Sezzle status: ${sezzleStatus}, Checkout status: ${checkoutStatus}`, 'SezzleVerificationResolver');
            return {
              success: false,
              message: `Payment not completed. Status: ${sezzleStatus || checkoutStatus || 'unknown'}`
            };
          }
        } else {
          // Unknown result type - log it for debugging
          Logger.error(`[Sezzle] Unknown settlement result type for order ${args.orderCode}`, 'SezzleVerificationResolver');
          Logger.error(`[Sezzle] Result structure: ${JSON.stringify(settlementResult)}`, 'SezzleVerificationResolver');
          return { success: false, message: 'Unknown settlement result' };
        }
      } else {
        // Null or non-object result
        Logger.error(`[Sezzle] Invalid settlement result for order ${args.orderCode}: ${settlementResult}`, 'SezzleVerificationResolver');
        return { success: false, message: 'Invalid settlement result' };
      }
    } catch (error: any) {
      Logger.error(`[Sezzle] Payment verification error for order ${args.orderCode}: ${error.message}`, 'SezzleVerificationResolver');
      return { success: false, message: `Verification failed: ${error.message}` };
    }
  }
}
