import { Field, InputType, ObjectType } from '@nestjs/graphql';

@InputType()
export class CartItemInput {
  @Field()
  productVariantId: string;

  @Field()
  quantity: number;

  @Field()
  unitPrice: number;
}

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