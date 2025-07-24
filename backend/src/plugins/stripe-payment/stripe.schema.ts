import gql from 'graphql-tag';

export const stripeSchemaExtensions = gql`
  type StripePaymentIntent {
    clientSecret: String!
    paymentIntentId: String!
  }

  extend type Mutation {
    createStripePaymentIntent(amount: Float!): StripePaymentIntent!
  }

  extend type Query {
    stripePublishableKey: String!
  }
`;
