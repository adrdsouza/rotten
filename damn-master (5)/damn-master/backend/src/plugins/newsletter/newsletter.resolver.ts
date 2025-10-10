import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext } from '@vendure/core';
import { SendPulseService } from '../../services/sendpulse.service.js';
import { NewsletterSubscriptionInput } from './newsletter.types.js';

@Resolver()
export class NewsletterResolver {
    constructor(private sendPulseService: SendPulseService) {}

    @Mutation()
    async subscribeToNewsletter(
        @Args() args: { input: NewsletterSubscriptionInput },
        @Ctx() _ctx: RequestContext
    ) {
        const result = await this.sendPulseService.subscribeToNewsletter(args.input);

        if (result.success) {
            return {
                __typename: 'NewsletterSubscriptionSuccess',
                success: true,
                message: result.message,
                subscriberId: result.data?.subscriberId,
            };
        } else {
            return {
                __typename: 'NewsletterSubscriptionError',
                errorCode: result.errorCode || 'SUBSCRIPTION_FAILED',
                message: result.message,
                details: result.data?.details,
            };
        }
    }

    @Mutation()
    async unsubscribeFromNewsletter(
        @Args() args: { email: string },
        @Ctx() _ctx: RequestContext
    ) {
        const result = await this.sendPulseService.unsubscribeFromNewsletter(args.email);

        if (result.success) {
            return {
                __typename: 'NewsletterUnsubscribeSuccess',
                success: true,
                message: result.message,
            };
        } else {
            return {
                __typename: 'NewsletterUnsubscribeError',
                errorCode: result.errorCode || 'UNSUBSCRIBE_FAILED',
                message: result.message,
                details: result.data?.details,
            };
        }
    }
}