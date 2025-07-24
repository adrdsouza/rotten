import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import Stripe from 'stripe';

@Resolver()
export class StripeResolver {
  private stripe: Stripe;

  constructor() {
    // Initialize Stripe with secret key from environment
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });
  }

  @Mutation()
  @Allow(Permission.Owner)
  async createStripePaymentIntent(
    @Ctx() ctx: RequestContext,
    @Args() args: { amount: number }
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(args.amount * 100), // Convert to cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error: any) {
      throw new Error(`Failed to create payment intent: ${error?.message || 'Unknown error'}`);
    }
  }

  @Query()
  @Allow(Permission.Owner)
  async stripePublishableKey(): Promise<string> {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }
}
