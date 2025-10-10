import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { CouponValidationService } from './coupon-validation.service.js';
import { ValidateLocalCartCouponInput, CouponValidationResult } from './types.js';

@Resolver()
export class CouponValidationResolver {
  constructor(private couponValidationService: CouponValidationService) {}

  @Query(() => CouponValidationResult)
  async validateLocalCartCoupon(
    @Ctx() ctx: RequestContext,
    @Args('input') input: ValidateLocalCartCouponInput
  ): Promise<CouponValidationResult> {
    return this.couponValidationService.validateCoupon(ctx, input);
  }
}