import { Injectable } from '@nestjs/common';
import { TransactionalConnection, RequestContext } from '@vendure/core';
import { CartOrderMapping } from '../entities/cart-order-mapping.entity';

@Injectable()
export class CartMappingService {
    constructor(private connection: TransactionalConnection) {}

    async createMapping(
        ctx: RequestContext,
        cartUuid: string,
        orderId: string,
        orderCode: string,
        paymentIntentId?: string
    ): Promise<CartOrderMapping> {
        const mapping = new CartOrderMapping({
            cartUuid,
            orderId,
            orderCode,
            paymentIntentId,
            createdAt: new Date(),
        });

        return this.connection.getRepository(ctx, CartOrderMapping).save(mapping);
    }

    async findByCartUuid(
        ctx: RequestContext,
        cartUuid: string
    ): Promise<CartOrderMapping | null> {
        return this.connection.getRepository(ctx, CartOrderMapping).findOne({
            where: { cartUuid }
        });
    }

    async updateWithPaymentIntent(
        ctx: RequestContext,
        cartUuid: string,
        paymentIntentId: string
    ): Promise<CartOrderMapping | null> {
        const mapping = await this.findByCartUuid(ctx, cartUuid);
        if (mapping) {
            mapping.paymentIntentId = paymentIntentId;
            return this.connection.getRepository(ctx, CartOrderMapping).save(mapping);
        }
        return null;
    }

    async markCompleted(
        ctx: RequestContext,
        cartUuid: string
    ): Promise<CartOrderMapping | null> {
        const mapping = await this.findByCartUuid(ctx, cartUuid);
        if (mapping) {
            mapping.completedAt = new Date();
            return this.connection.getRepository(ctx, CartOrderMapping).save(mapping);
        }
        return null;
    }

    async findByOrderCode(
        ctx: RequestContext,
        orderCode: string
    ): Promise<CartOrderMapping | null> {
        return this.connection.getRepository(ctx, CartOrderMapping).findOne({
            where: { orderCode }
        });
    }
}
