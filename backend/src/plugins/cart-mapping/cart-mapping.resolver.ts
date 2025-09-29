import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { CartMappingService } from '../../services/cart-mapping.service';
import { CartOrderMapping } from '../../entities/cart-order-mapping.entity';

@Resolver()
export class CartMappingResolver {
    constructor(private cartMappingService: CartMappingService) {}

    @Mutation()
    @Allow(Permission.Public)
    async createCartMapping(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            cartUuid: string;
            orderId: string;
            orderCode: string;
            paymentIntentId?: string;
        }
    ): Promise<CartOrderMapping> {
        return this.cartMappingService.createMapping(
            ctx,
            args.cartUuid,
            args.orderId,
            args.orderCode,
            args.paymentIntentId
        );
    }

    @Mutation()
    @Allow(Permission.Public)
    async updateCartMappingPaymentIntent(
        @Ctx() ctx: RequestContext,
        @Args() args: {
            cartUuid: string;
            paymentIntentId: string;
        }
    ): Promise<CartOrderMapping | null> {
        return this.cartMappingService.updateWithPaymentIntent(
            ctx,
            args.cartUuid,
            args.paymentIntentId
        );
    }

    @Mutation()
    @Allow(Permission.Public)
    async markCartMappingCompleted(
        @Ctx() ctx: RequestContext,
        @Args() args: { cartUuid: string }
    ): Promise<CartOrderMapping | null> {
        return this.cartMappingService.markCompleted(ctx, args.cartUuid);
    }

    @Query()
    @Allow(Permission.Public)
    async getCartMapping(
        @Ctx() ctx: RequestContext,
        @Args() args: { cartUuid: string }
    ): Promise<CartOrderMapping | null> {
        return this.cartMappingService.findByCartUuid(ctx, args.cartUuid);
    }

    @Query()
    @Allow(Permission.Public)
    async getCartMappingByOrderCode(
        @Ctx() ctx: RequestContext,
        @Args() args: { orderCode: string }
    ): Promise<CartOrderMapping | null> {
        return this.cartMappingService.findByOrderCode(ctx, args.orderCode);
    }
}