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
import { IsNull } from 'typeorm';
import { ValidateLocalCartCouponInput, CouponValidationResult } from './types.js';

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

      // Check usage limits
      const usageLimitCheck = await this.checkUsageLimits(ctx, promotion, input);
      if (!usageLimitCheck.valid) {
        return this.createErrorResult([usageLimitCheck.error || 'Coupon usage limit exceeded']);
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

    // Find all enabled, non-deleted promotions with this coupon code
    const promotions = await promotionRepository.find({
      where: {
        couponCode,
        enabled: true,
        deletedAt: IsNull() // CRITICAL: Exclude deleted promotions
      },
      order: {
        id: 'DESC' // Get newest first
      }
    });

    if (promotions.length === 0) {
      return null;
    }



    // Return the newest promotion (highest ID)
    return promotions[0];
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

        case 'verified_customer':
          // CRITICAL: Check customer verification status
          const categoriesArg = args.find((arg: any) => arg.name === 'categories');
          const requiredCategories = categoriesArg?.value ? JSON.parse(categoriesArg.value) : [];

          if (!input.customerId) {
            return {
              valid: false,
              error: 'Please sign in to use this coupon'
            };
          }


          if (requiredCategories.length > 0) {
            const hasVerification = await this.checkCustomerVerification(
              ctx,
              input.customerId,
              requiredCategories
            );
            if (!hasVerification.valid) {
              return {
                valid: false,
                error: hasVerification.error || 'This coupon requires verification'
              };
            }
          }
          break;

        case 'containsProducts':
          const productIdsArg = args.find((arg: any) => arg.name === 'productIds');
          const productVariantIdsArg = args.find((arg: any) => arg.name === 'productVariantIds');

          const requiredProductIds = productIdsArg?.value ? JSON.parse(productIdsArg.value) : [];
          const requiredVariantIds = productVariantIdsArg?.value ? JSON.parse(productVariantIdsArg.value) : [];

          const hasRequiredProducts = this.checkContainsProducts(input.cartItems, requiredProductIds, requiredVariantIds);
          if (!hasRequiredProducts) {
            return {
              valid: false,
              error: 'This coupon requires specific products in your cart'
            };
          }
          break;

        case 'hasFacetValues':
          // Note: This would require product/variant data with facets
          // For now, we'll log it as unhandled since we don't have facet data in our cart input
          Logger.warn(`Facet value conditions require product facet data not available in local cart validation`, 'CouponValidationService');
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

  private async checkCustomerVerification(
    ctx: RequestContext,
    customerId: string,
    requiredCategories: string[]
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const customer = await this.customerService.findOne(ctx, customerId);
      if (!customer) {
        return {
          valid: false,
          error: 'Please log in to use this coupon'
        };
      }

      const activeVerifications: string[] = (customer.customFields as any)?.activeVerifications || [];

      // Check if customer has any of the required verification categories
      const hasRequiredVerification = requiredCategories.some((category: string) =>
        activeVerifications.includes(category)
      );

      if (!hasRequiredVerification) {
        return {
          valid: false,
          error: 'Please verify your status to use this coupon'
        };
      }

      return { valid: true };
    } catch (error) {
      Logger.error('Error checking customer verification:', error instanceof Error ? error.message : String(error), 'CouponValidationService');
      return {
        valid: false,
        error: 'Failed to verify customer status'
      };
    }
  }

  private checkContainsProducts(
    cartItems: Array<{ productVariantId: string; quantity: number; unitPrice: number }>,
    requiredProductIds: string[],
    requiredVariantIds: string[]
  ): boolean {
    try {
      // Check if cart contains any of the required product variants
      if (requiredVariantIds.length > 0) {
        const hasRequiredVariant = cartItems.some(item =>
          requiredVariantIds.includes(item.productVariantId)
        );
        if (hasRequiredVariant) {
          return true;
        }
      }

      // Note: Checking by productIds would require additional data about which
      // product each variant belongs to. For now, we only support variant-level checking.
      if (requiredProductIds.length > 0) {
        Logger.warn('Product-level containsProducts condition requires additional product data not available in local cart validation', 'CouponValidationService');
      }

      return requiredProductIds.length === 0 && requiredVariantIds.length === 0;
    } catch (error) {
      Logger.error('Error checking contains products:', error instanceof Error ? error.message : String(error), 'CouponValidationService');
      return false;
    }
  }

  private async checkUsageLimits(
    ctx: RequestContext,
    promotion: Promotion,
    input: ValidateLocalCartCouponInput
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check total usage limit
      if ((promotion as any).usageLimit && (promotion as any).usageLimit > 0) {
        // Note: This would require querying actual order usage from the database
        // For local cart validation, we can't easily check this without additional queries
        Logger.warn('Total usage limit checking requires database queries not implemented in local cart validation', 'CouponValidationService');
      }

      // Check per-customer usage limit
      if ((promotion as any).perCustomerUsageLimit && (promotion as any).perCustomerUsageLimit > 0) {
        if (!input.customerId) {
          // Anonymous users can't have usage limits checked
          return { valid: true };
        }

        // Note: This would require querying customer's order history
        // For local cart validation, we can't easily check this without additional queries
        Logger.warn('Per-customer usage limit checking requires database queries not implemented in local cart validation', 'CouponValidationService');
      }

      return { valid: true };
    } catch (error) {
      Logger.error('Error checking usage limits:', error instanceof Error ? error.message : String(error), 'CouponValidationService');
      return {
        valid: false,
        error: 'Failed to check coupon usage limits'
      };
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