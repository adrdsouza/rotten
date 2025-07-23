import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
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