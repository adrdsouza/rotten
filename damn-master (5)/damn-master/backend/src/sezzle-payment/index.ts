import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { sezzlePaymentHandler } from './sezzle-payment-handler.js';
import { SezzleVerificationResolver } from './sezzle-verification.resolver.js';
import { gql } from 'graphql-tag';

const sezzleVerificationSchema = gql`
  type SezzleVerificationResult {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    verifySezzlePayment(orderCode: String!): SezzleVerificationResult!
  }
`;

@VendurePlugin({
  compatibility: '^3.0.0',
  imports: [PluginCommonModule],
  providers: [SezzleVerificationResolver],
  shopApiExtensions: {
    schema: sezzleVerificationSchema,
    resolvers: [SezzleVerificationResolver],
  },
  configuration: config => {
    config.paymentOptions.paymentMethodHandlers.push(sezzlePaymentHandler);
    return config;
  },
})
export class SezzlePaymentPlugin {}

export * from './sezzle-payment-handler.js';
