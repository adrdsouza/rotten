import { VendurePlugin, PluginCommonModule } from '@vendure/core';
import gql from 'graphql-tag';
import { SendPulseService } from '../../services/sendpulse.service';
import { NewsletterResolver } from './newsletter.resolver';

const schemaExtension = gql`
    input NewsletterSubscriptionInput {
        email: String!
        name: String
        source: String
    }

    type NewsletterSubscriptionSuccess {
        success: Boolean!
        message: String!
        subscriberId: String
    }

    type NewsletterSubscriptionError {
        errorCode: String!
        message: String!
        details: String
    }

    union NewsletterSubscriptionResult = NewsletterSubscriptionSuccess | NewsletterSubscriptionError

    type NewsletterUnsubscribeSuccess {
        success: Boolean!
        message: String!
    }

    type NewsletterUnsubscribeError {
        errorCode: String!
        message: String!
        details: String
    }

    union NewsletterUnsubscribeResult = NewsletterUnsubscribeSuccess | NewsletterUnsubscribeError

    extend type Mutation {
        subscribeToNewsletter(input: NewsletterSubscriptionInput!): NewsletterSubscriptionResult!
        unsubscribeFromNewsletter(email: String!): NewsletterUnsubscribeResult!
    }
`;

@VendurePlugin({
    compatibility: '^3.3.0',
    imports: [PluginCommonModule],
    providers: [SendPulseService, NewsletterResolver],
    shopApiExtensions: {
        schema: schemaExtension,
        resolvers: [NewsletterResolver],
    },
})
export class NewsletterPlugin {}