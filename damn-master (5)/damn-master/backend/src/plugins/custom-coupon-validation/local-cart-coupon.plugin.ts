import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { gql } from 'graphql-tag';
import { CouponValidationResolver } from './coupon-validation.resolver.js';
import { CouponValidationService } from './coupon-validation.service.js';

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
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [CouponValidationService],
  shopApiExtensions: {
    schema,
    resolvers: [CouponValidationResolver],
  },
})
export class LocalCartCouponPlugin {}