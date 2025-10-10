# Complete Local Cart Coupon Implementation Plan

## Phase 1: Backend - Custom Vendure Plugin

### 1.1 Plugin Structure
```
backend/src/plugins/custom-coupon-validation/
├── local-cart-coupon.plugin.ts
├── coupon-validation.resolver.ts
├── coupon-validation.service.ts
└── types.ts
```

### 1.2 Plugin Implementation

#### `types.ts`
```typescript
import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class ValidateLocalCartCouponInput {
  @Field()
  couponCode: string;

  @Field()
  cartTotal: number;

  @Field(() => [CartItemInput])
  cartItems: CartItemInput[];

  @Field({ nullable: true })
  customerId?: string;
}

@InputType()
export class CartItemInput {
  @Field()
  productVariantId: string;

  @Field()
  quantity: number;

  @Field()
  unitPrice: number;
}

@ObjectType()
export class CouponValidationResult {
  @Field()
  isValid: boolean;

  @Field(() => [String])
  validationErrors: string[];

  @Field({ nullable: true })
  appliedCouponCode?: string;

  @Field()
  discountAmount: number;

  @Field({ nullable: true })
  discountPercentage?: number;

  @Field()
  freeShipping: boolean;

  @Field({ nullable: true })
  promotionName?: string;

  @Field({ nullable: true })
  promotionDescription?: string;
}
```

#### `local-cart-coupon.plugin.ts`
```typescript
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'apollo-server-core';
import { CouponValidationResolver } from './coupon-validation.resolver';
import { CouponValidationService } from './coupon-validation.service';

const schema = gql`
  input CartItemInput {
    productVariantId: ID!
    quantity: Int!
    unitPrice: Float!
  }

  input ValidateLocalCartCouponInput {
    couponCode: String!
    cartTotal: Float!
    cartItems: [CartItemInput!]!
    customerId: ID
  }

  type CouponValidationResult {
    isValid: Boolean!
    validationErrors: [String!]!
    appliedCouponCode: String
    discountAmount: Float!
    discountPercentage: Float
    freeShipping: Boolean!
    promotionName: String
    promotionDescription: String
  }

  extend type Query {
    validateLocalCartCoupon(input: ValidateLocalCartCouponInput!): CouponValidationResult!
  }
`;

@VendurePlugin({
  imports: [PluginCommonModule],
  providers: [CouponValidationService],
  shopApiExtensions: {
    schema,
    resolvers: [CouponValidationResolver],
  },
})
export class LocalCartCouponPlugin {}
```

#### `coupon-validation.resolver.ts`
```typescript
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { CouponValidationService } from './coupon-validation.service';
import { ValidateLocalCartCouponInput, CouponValidationResult } from './types';

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
```

#### `coupon-validation.service.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { RequestContext, TransactionalConnection, Promotion, Customer } from '@vendure/core';
import { ValidateLocalCartCouponInput, CouponValidationResult } from './types';

@Injectable()
export class CouponValidationService {
  constructor(private connection: TransactionalConnection) {}

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
      console.error('Error validating coupon:', error);
      return this.createErrorResult(['Failed to validate coupon']);
    }
  }

  private async findPromotionByCoupon(ctx: RequestContext, couponCode: string) {
    const promotionRepository = this.connection.getRepository(ctx, Promotion);
    
    return await promotionRepository
      .createQueryBuilder('promotion')
      .leftJoinAndSelect('promotion.actions', 'actions')
      .leftJoinAndSelect('promotion.conditions', 'conditions')
      .where('promotion.couponCode = :couponCode', { couponCode })
      .andWhere('promotion.enabled = :enabled', { enabled: true })
      .getOne();
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
    for (const condition of promotion.conditions || []) {
      const args = this.parseConditionArgs(condition.args);
      
      switch (condition.code) {
        case 'minimum_order_amount':
          const minAmount = args.amount || 0;
          if (input.cartTotal < minAmount) {
            return {
              valid: false,
              error: `Minimum order amount of ${minAmount} required`
            };
          }
          break;
          
        case 'customer_group':
          // Check customer group if customerId provided
          if (input.customerId) {
            const customerInGroup = await this.checkCustomerGroup(
              ctx, 
              input.customerId, 
              args.customerGroupId
            );
            if (!customerInGroup) {
              return {
                valid: false,
                error: 'This coupon is not valid for your customer group'
              };
            }
          }
          break;
          
        // Add more condition checks as needed
      }
    }
    
    return { valid: true };
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

    for (const action of promotion.actions || []) {
      const args = this.parseActionArgs(action.args);
      
      switch (action.code) {
        case 'order_percentage_discount':
          discountPercentage = args.discount || 0;
          discountAmount = Math.round((input.cartTotal * discountPercentage) / 100);
          
          if (args.maxDiscount) {
            discountAmount = Math.min(discountAmount, args.maxDiscount);
          }
          break;
          
        case 'order_fixed_discount':
          discountAmount = args.discount || 0;
          // Don't exceed cart total
          discountAmount = Math.min(discountAmount, input.cartTotal);
          break;
          
        case 'free_shipping':
          freeShipping = true;
          break;
      }
    }

    return {
      discountAmount,
      discountPercentage,
      freeShipping,
    };
  }

  private parseActionArgs(args: any[]): Record<string, any> {
    const parsed: Record<string, any> = {};
    for (const arg of args || []) {
      parsed[arg.name] = arg.value;
    }
    return parsed;
  }

  private parseConditionArgs(args: any[]): Record<string, any> {
    const parsed: Record<string, any> = {};
    for (const arg of args || []) {
      parsed[arg.name] = arg.value;
    }
    return parsed;
  }

  private async checkCustomerGroup(
    ctx: RequestContext,
    customerId: string,
    groupId: string
  ): Promise<boolean> {
    const customerRepository = this.connection.getRepository(ctx, Customer);
    const customer = await customerRepository
      .createQueryBuilder('customer')
      .leftJoinAndSelect('customer.groups', 'groups')
      .where('customer.id = :customerId', { customerId })
      .getOne();
    
    return customer?.groups?.some(group => group.id === groupId) || false;
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
```

### 1.3 Register Plugin
In `vendure-config.ts`:
```typescript
import { LocalCartCouponPlugin } from './plugins/custom-coupon-validation/local-cart-coupon.plugin';

export const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    LocalCartCouponPlugin,
  ],
};
```

## Phase 2: Frontend Integration

### 2.1 GraphQL Query Generation
After plugin deployment, regenerate GraphQL types:
```bash
pnpm generate-shop
```

### 2.2 Local Cart Service Update

Update your service to use the generated types and new API field names (`isValid`, `validationErrors`, etc.).

### 2.3 Cart Context & UI Update

Update your cart context and UI to use the new coupon state shape and fields, reflecting the new backend result structure.

## Phase 3: Checkout Integration

When transitioning from local cart to Vendure order during checkout, apply the coupon code to the order if present, as before.

## Benefits of This Approach

1. **No unnecessary orders**: Validates coupons without creating Vendure orders
2. **Rich validation**: Supports complex promotion conditions and rules
3. **Real-time feedback**: Immediate coupon validation in the UI
4. **Seamless checkout**: Smooth transition from local cart to Vendure order
5. **Extensible**: Easy to add new promotion types and conditions

This implementation provides a complete solution for validating coupons in a local cart environment while maintaining compatibility with Vendure's promotion system.