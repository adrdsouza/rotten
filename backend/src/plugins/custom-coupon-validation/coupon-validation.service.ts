import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  TransactionalConnection,
  Promotion,
  PromotionService,
  CustomerService,
  ProductVariantService,
  Logger
} from '@vendure/core';
import { ValidateLocalCartCouponInput, CouponValidationResult } from './types';

@Injectable()
export class CouponValidationService {
  constructor(
    private connection: TransactionalConnection,
    private promotionService: PromotionService,
    private customerService: CustomerService,
    private productVariantService: ProductVariantService,
  ) {}

  async validateCoupon(
    ctx: RequestContext,
    input: ValidateLocalCartCouponInput
  ): Promise<CouponValidationResult> {
    try {
      const promotion = await this.findPromotionByCoupon(ctx, input.couponCode);
      if (!promotion) {
        return this.createErrorResult(['Invalid coupon code']);
      }

      if (!this.isPromotionActive(promotion)) {
        return this.createErrorResult(['Coupon is not currently active']);
      }

      const conditionCheck = await this.checkPromotionConditions(ctx, promotion, input);
      if (!conditionCheck.valid) {
        return this.createErrorResult([conditionCheck.error || 'Coupon validation failed']);
      }

      const discountInfo = await this.calculateDiscount(ctx, promotion, input);

      return {
        isValid: true,
        validationErrors: [],
        appliedCouponCode: input.couponCode,
        ...discountInfo,
        promotionName: promotion.name,
        promotionDescription: promotion.description,
      };
    } catch (error) {
      Logger.error('Error validating coupon:', error instanceof Error ? error.message : String(error), 'CouponValidationService');
      return this.createErrorResult(['Failed to validate coupon']);
    }
  }

  private async findPromotionByCoupon(ctx: RequestContext, couponCode: string): Promise<Promotion | null> {
    const promotionRepository = this.connection.getRepository(ctx, Promotion);

    return await promotionRepository.findOne({
      where: {
        couponCode,
        enabled: true
      }
    });
  }

  private isPromotionActive(promotion: Promotion): boolean {
    const now = new Date();

    if (promotion.startsAt && new Date(promotion.startsAt) > now) {
      return false;
    }

    if (promotion.endsAt && new Date(promotion.endsAt) < now) {
      return false;
    }

    return true;
  }

  private async checkPromotionConditions(
    ctx: RequestContext,
    promotion: Promotion,
    input: ValidateLocalCartCouponInput
  ): Promise<{ valid: boolean; error?: string }> {
    // Check basic promotion conditions
    const conditions = (promotion as any).conditions || [];

    for (const condition of conditions) {
      const args = condition.args || [];

      switch (condition.code) {
        case 'minimum_order_amount':
          const minAmountArg = args.find((arg: any) => arg.name === 'amount');
          const minAmountValue = minAmountArg?.value || 0;
          const minAmount = typeof minAmountValue === 'string' ? parseFloat(minAmountValue) : minAmountValue;
          if (input.cartTotal < minAmount) {
            return {
              valid: false,
              error: `Minimum order amount of $${(minAmount / 100).toFixed(2)} required`
            };
          }
          break;

        case 'customer_group':
          // Check customer group if customerId provided
          if (input.customerId) {
            const customerGroupArg = args.find((arg: any) => arg.name === 'customerGroupId');
            const customerGroupId = customerGroupArg?.value;
            if (customerGroupId) {
              const customerInGroup = await this.checkCustomerGroup(
                ctx,
                input.customerId,
                customerGroupId
              );
              if (!customerInGroup) {
                return {
                  valid: false,
                  error: 'This coupon is not valid for your customer group'
                };
              }
            }
          }
          break;

        // Add more condition checks as needed
        default:
          Logger.warn(`Unhandled promotion condition: ${condition.code}`, 'CouponValidationService');
          break;
      }
    }

    return { valid: true };
  }

  private async checkCustomerGroup(
    ctx: RequestContext,
    customerId: string,
    customerGroupId: string
  ): Promise<boolean> {
    try {
      const customer = await this.customerService.findOne(ctx, customerId);
      if (!customer) return false;

      return customer.groups?.some(group => group.id === customerGroupId) || false;
    } catch (error) {
      Logger.error('Error checking customer group:', error instanceof Error ? error.message : String(error), 'CouponValidationService');
      return false;
    }
  }

  private async calculateDiscount(
    ctx: RequestContext,
    promotion: Promotion,
    input: ValidateLocalCartCouponInput
  ): Promise<{
    discountAmount: number;
    discountPercentage?: number;
    freeShipping: boolean;
  }> {
    let discountAmount = 0;
    let discountPercentage: number | undefined;
    let freeShipping = false;

    const actions = (promotion as any).actions || [];

    for (const action of actions) {
      const args = action.args || [];

      switch (action.code) {
        case 'order_percentage_discount':
          const percentageArg = args.find((arg: any) => arg.name === 'discount');
          const percentageValue = percentageArg?.value || 0;
          const percentage = typeof percentageValue === 'string' ? parseFloat(percentageValue) : percentageValue;
          discountPercentage = percentage;
          discountAmount = Math.round((input.cartTotal * percentage) / 100);
          break;

        case 'order_fixed_discount':
          const fixedAmountArg = args.find((arg: any) => arg.name === 'discount');
          const fixedAmountValue = fixedAmountArg?.value || 0;
          const fixedAmount = typeof fixedAmountValue === 'string' ? parseFloat(fixedAmountValue) : fixedAmountValue;
          discountAmount = Math.min(fixedAmount, input.cartTotal);
          break;

        case 'free_shipping':
          freeShipping = true;
          break;

        // Add more action types as needed
        default:
          Logger.warn(`Unhandled promotion action: ${action.code}`, 'CouponValidationService');
          break;
      }
    }

    return {
      discountAmount,
      discountPercentage,
      freeShipping,
    };
  }

  private createErrorResult(errors: string[]): CouponValidationResult {
    return {
      isValid: false,
      validationErrors: errors,
      discountAmount: 0,
      freeShipping: false,
    };
  }
}