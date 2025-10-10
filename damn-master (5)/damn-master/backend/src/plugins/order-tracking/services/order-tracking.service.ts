import { Injectable } from '@nestjs/common';
import {
  RequestContext,
  OrderService,
  Order,
  TransactionalConnection,
  Logger,
  EntityHydrator,
} from '@vendure/core';

export interface OrderTrackingResult {
  order?: Order;
  error?: string;
  success: boolean;
}

@Injectable()
export class OrderTrackingService {
  private readonly trackingAttempts = new Map<string, number>();
  private readonly MAX_ATTEMPTS_PER_HOUR = 10;

  constructor(
    private orderService: OrderService,
    private connection: TransactionalConnection,
    private entityHydrator: EntityHydrator,
  ) {}

  /**
   * Track an order by order code and email address
   * Provides secure order lookup with email verification
   */
  async trackOrder(
    ctx: RequestContext,
    orderCode: string,
    email: string
  ): Promise<OrderTrackingResult> {
    try {
      // Rate limiting check
      const clientKey = this.getClientKey(ctx, email);
      if (this.isRateLimited(clientKey)) {
        Logger.warn(
          `Rate limit exceeded for order tracking: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Too many tracking attempts. Please try again later.',
        };
      }

      // Input validation
      if (!orderCode || !email) {
        return {
          success: false,
          error: 'Order code and email are required.',
        };
      }

      if (!this.isValidEmail(email)) {
        return {
          success: false,
          error: 'Please provide a valid email address.',
        };
      }

      // Find the order by code with relations
      const order = await this.orderService.findOneByCode(ctx, orderCode, [
        'customer',
        'lines',
        'lines.productVariant',
        'lines.productVariant.product',
        'lines.featuredAsset',
        'fulfillments',
        'payments',
      ]);

      if (!order) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Order not found: ${orderCode} for email: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Hydrate product variants to ensure custom fields are loaded
      if (order.lines) {
        for (const line of order.lines) {
          if (line.productVariant) {
            await this.entityHydrator.hydrate(ctx, line.productVariant, {
              relations: ['product'],
            });
          }
        }
      }

      if (!order) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Order not found: ${orderCode} for email: ${email}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Verify email matches (check customer email)
      const orderEmail = order.customer?.emailAddress;
      if (!orderEmail || orderEmail.toLowerCase() !== email.toLowerCase()) {
        this.incrementAttempts(clientKey);
        Logger.warn(
          `Email mismatch for order ${orderCode}: provided ${email}, expected ${orderEmail}`,
          'OrderTrackingService'
        );
        return {
          success: false,
          error: 'Order not found. Please check your order number and email address.',
        };
      }

      // Success - reset rate limiting for this client
      this.resetAttempts(clientKey);
      
      Logger.info(
        `Successful order tracking: ${orderCode} for ${email}`,
        'OrderTrackingService'
      );

      return {
        success: true,
        order,
      };
    } catch (error) {
      Logger.error(
        `Error tracking order ${orderCode}: ${error instanceof Error ? error.message : error}`,
        'OrderTrackingService'
      );
      return {
        success: false,
        error: 'Unable to track order at this time. Please try again later.',
      };
    }
  }



  /**
   * Generate a client key for rate limiting
   */
  private getClientKey(ctx: RequestContext, email: string): string {
    const ip = ctx.req?.ip || 'unknown';
    const userAgent = ctx.req?.get('user-agent') || 'unknown';
    return `${ip}:${email}:${userAgent}`.substring(0, 100);
  }

  /**
   * Check if client is rate limited
   */
  private isRateLimited(clientKey: string): boolean {
    const attempts = this.trackingAttempts.get(clientKey) || 0;
    return attempts >= this.MAX_ATTEMPTS_PER_HOUR;
  }

  /**
   * Increment tracking attempts for a client
   */
  private incrementAttempts(clientKey: string): void {
    const current = this.trackingAttempts.get(clientKey) || 0;
    this.trackingAttempts.set(clientKey, current + 1);
    
    // Clean up old entries every 100 attempts
    if (this.trackingAttempts.size > 1000) {
      this.cleanupOldAttempts();
    }
  }

  /**
   * Reset tracking attempts for a client
   */
  private resetAttempts(clientKey: string): void {
    this.trackingAttempts.delete(clientKey);
  }

  /**
   * Clean up old tracking attempts (simple cleanup - in production use Redis with TTL)
   */
  private cleanupOldAttempts(): void {
    if (this.trackingAttempts.size > 500) {
      const keysToDelete = Array.from(this.trackingAttempts.keys()).slice(0, 250);
      keysToDelete.forEach(key => this.trackingAttempts.delete(key));
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}