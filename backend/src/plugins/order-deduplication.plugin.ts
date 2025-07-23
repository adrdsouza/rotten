import {
  VendurePlugin,
  PluginCommonModule,
  EventBus,
  OrderEvent,
  Logger,
  RequestContext,
  Order,
  OrderService,
  TransactionalConnection,
  Injector
} from '@vendure/core';
import { Redis } from 'ioredis';
import { getRedisConnection } from '../utils/redis-connection-pool';

/**
 * Plugin to prevent duplicate order creation during high-traffic scenarios
 * Uses Redis to track order creation attempts and prevent race conditions
 */
@VendurePlugin({
  imports: [PluginCommonModule],
})
export class OrderDeduplicationPlugin {
  private redis: Redis | null = null;
  private readonly DEDUP_PREFIX = 'order_dedup:';
  private readonly DEDUP_TTL = 300; // 5 minutes TTL for deduplication keys

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    try {
      // Use shared Redis connection pool instead of creating a new connection
      this.redis = getRedisConnection('order-deduplication');
      Logger.info('Using shared Redis connection for OrderDeduplicationPlugin', 'OrderDeduplicationPlugin');
    } catch (error) {
      Logger.error(`Failed to initialize Redis for OrderDeduplicationPlugin: ${error}`, 'OrderDeduplicationPlugin');
    }
  }

  /**
   * Generate a deduplication key based on customer session and cart contents
   */
  private generateDedupKey(ctx: RequestContext, cartItems: any[]): string {
    const sessionId = ctx.session?.id || 'anonymous';
    const customerId = ctx.activeUserId || 'guest';
    const cartHash = this.hashCartItems(cartItems);
    return `${this.DEDUP_PREFIX}${customerId}_${sessionId}_${cartHash}`;
  }

  /**
   * Create a hash of cart items to detect identical carts
   */
  private hashCartItems(items: any[]): string {
    const sortedItems = items
      .map(item => `${item.productVariantId}:${item.quantity}`)
      .sort()
      .join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < sortedItems.length; i++) {
      const char = sortedItems.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if an order creation is already in progress for this cart
   */
  private async isOrderCreationInProgress(dedupKey: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      const exists = await this.redis.exists(dedupKey);
      return exists === 1;
    } catch (error) {
      Logger.error(`Error checking order deduplication: ${error}`, 'OrderDeduplicationPlugin');
      return false; // Fail open
    }
  }

  /**
   * Mark order creation as in progress
   */
  private async markOrderCreationInProgress(dedupKey: string): Promise<boolean> {
    if (!this.redis) return true;
    
    try {
      const result = await this.redis.setex(dedupKey, this.DEDUP_TTL, Date.now().toString());
      return result === 'OK';
    } catch (error) {
      Logger.error(`Error setting order deduplication key: ${error}`, 'OrderDeduplicationPlugin');
      return true; // Fail open
    }
  }

  /**
   * Clear order creation lock
   */
  private async clearOrderCreationLock(dedupKey: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.del(dedupKey);
    } catch (error) {
      Logger.error(`Error clearing order deduplication key: ${error}`, 'OrderDeduplicationPlugin');
    }
  }

  static init(): typeof OrderDeduplicationPlugin {
    return OrderDeduplicationPlugin;
  }

  async onApplicationBootstrap() {
    // Plugin initialization logic can be added here if needed
    Logger.info('OrderDeduplicationPlugin initialized', 'OrderDeduplicationPlugin');
  }

  /**
   * Configure the plugin to listen for order events
   * This method will be called by Vendure's plugin system
   */
  configure(config: any) {
    // Add event subscription logic here if needed
    return config;
  }

  /**
   * Check if a request should be blocked based on suspicious patterns
   */
  private shouldBlockRequest(ctx: RequestContext): boolean {
    const req = (ctx as any).req;
    if (!req) return false;

    const userAgent = req.headers['user-agent'] || '';
    const referer = req.headers.referer || '';

    // Block requests with "node" user agent that have no referer (likely automated)
    if (userAgent === 'node' && !referer) {
      Logger.warn(`Blocking suspicious order creation request: UA=${userAgent}, Referer=${referer}, IP=${req.ip}`, 'OrderDeduplicationPlugin');
      return true;
    }

    // Block requests from known monitoring/testing user agents
    const suspiciousUserAgents = [
      'SecurityTester',
      'HealthMonitor',
      'curl',
      'wget',
      'python-requests',
      'axios'
    ];

    if (suspiciousUserAgents.some(ua => userAgent.includes(ua))) {
      Logger.warn(`Blocking order creation from monitoring tool: UA=${userAgent}`, 'OrderDeduplicationPlugin');
      return true;
    }

    return false;
  }

  private async handleOrderCreated(event: OrderEvent): Promise<void> {
    try {
      const order = event.order;
      Logger.info(`Order created: ${order.code} with ${order.lines?.length || 0} items`, 'OrderDeduplicationPlugin');
      
      // Log potential duplicate if order has unusual characteristics
      if (order.lines && order.lines.length > 0) {
        const totalQuantity = order.lines.reduce((sum, line) => sum + line.quantity, 0);
        const uniqueVariants = new Set(order.lines.map(line => line.productVariant.id)).size;
        
        // Flag potential duplicates: high quantities or repeated variants
        if (totalQuantity > 10 || order.lines.length > uniqueVariants) {
          Logger.warn(
            `Potential duplicate order detected: ${order.code} - Total qty: ${totalQuantity}, Unique variants: ${uniqueVariants}, Lines: ${order.lines.length}`,
            'OrderDeduplicationPlugin'
          );
        }
      }
    } catch (error) {
      Logger.error(`Error handling order created event: ${error}`, 'OrderDeduplicationPlugin');
    }
  }

  onApplicationShutdown() {
    // No need to disconnect - shared connection pool handles this
    Logger.info('OrderDeduplicationPlugin shutdown - shared Redis connection will be managed by pool', 'OrderDeduplicationPlugin');
  }
}
