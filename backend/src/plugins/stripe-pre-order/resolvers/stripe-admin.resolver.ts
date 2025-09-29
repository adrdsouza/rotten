import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { 
  StripeAdminToolsService, 
  AdminPaymentInfo, 
  ManualSettlementResult,
  PaymentSearchFilters 
} from '../services/stripe-admin-tools.service';

/**
 * GraphQL resolver for Stripe admin tools
 * Provides admin-only endpoints for payment management
 */
@Resolver()
export class StripeAdminResolver {
  constructor(private adminToolsService: StripeAdminToolsService) {}

  @Query()
  @Allow(Permission.ReadOrder, Permission.ReadPayment)
  async searchStripePayments(
    @Ctx() ctx: RequestContext,
    @Args() args: {
      status?: 'pending' | 'settled' | 'failed';
      orderCode?: string;
      paymentIntentId?: string;
      dateFrom?: string;
      dateTo?: string;
      isRetryable?: boolean;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    payments: AdminPaymentInfo[];
    total: number;
    hasMore: boolean;
  }> {
    const filters: PaymentSearchFilters = {
      ...args,
      dateFrom: args.dateFrom ? new Date(args.dateFrom) : undefined,
      dateTo: args.dateTo ? new Date(args.dateTo) : undefined
    };

    return await this.adminToolsService.searchPayments(filters);
  }

  @Query()
  @Allow(Permission.ReadOrder, Permission.ReadPayment)
  async getStripePaymentDetails(
    @Ctx() ctx: RequestContext,
    @Args('paymentIntentId') paymentIntentId: string
  ): Promise<AdminPaymentInfo | null> {
    return await this.adminToolsService.getPaymentDetails(paymentIntentId);
  }

  @Query()
  @Allow(Permission.ReadOrder, Permission.ReadPayment)
  async getStripePaymentStatistics(
    @Ctx() ctx: RequestContext,
    @Args('days') days?: number
  ): Promise<{
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    pendingPayments: number;
    retryableFailures: number;
    manualSettlements: number;
    totalAmount: number;
    averageAmount: number;
  }> {
    return await this.adminToolsService.getPaymentStatistics(days || 30);
  }

  @Mutation()
  @Allow(Permission.UpdateOrder, Permission.CreatePayment)
  async manuallySettleStripePayment(
    @Ctx() ctx: RequestContext,
    @Args('paymentIntentId') paymentIntentId: string,
    @Args('bypassValidation') bypassValidation?: boolean
  ): Promise<ManualSettlementResult> {
    return await this.adminToolsService.manuallySettlePayment(
      paymentIntentId, 
      ctx, 
      bypassValidation || false
    );
  }

  @Mutation()
  @Allow(Permission.UpdateOrder, Permission.CreatePayment)
  async retryStripePaymentSettlement(
    @Ctx() ctx: RequestContext,
    @Args('paymentIntentId') paymentIntentId: string
  ): Promise<ManualSettlementResult> {
    return await this.adminToolsService.retryPaymentSettlement(paymentIntentId, ctx);
  }

  @Mutation()
  @Allow(Permission.UpdateOrder, Permission.DeletePayment)
  async cancelStripePayment(
    @Ctx() ctx: RequestContext,
    @Args('paymentIntentId') paymentIntentId: string,
    @Args('reason') reason: string
  ): Promise<ManualSettlementResult> {
    return await this.adminToolsService.cancelPayment(paymentIntentId, ctx, reason);
  }
}