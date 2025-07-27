// Backend plugin for Vendure to send cache invalidation events
import { PluginCommonModule, VendurePlugin, EventBus } from '@vendure/core';
import { ProductEvent, ProductVariantEvent, StockMovementEvent } from '@vendure/core';
import { Response } from 'express';
import { Controller, Get, Res } from '@nestjs/common';

// Simple SSE manager for cache invalidation
class CacheInvalidationManager {
  private connections = new Set<Response>();

  addConnection(res: Response) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    this.connections.add(res);

    res.on('close', () => {
      this.connections.delete(res);
    });

    // Send initial connection confirmation
    res.write('data: {"type": "connected"}\n\n');
  }

  broadcast(event: any) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    
    this.connections.forEach(res => {
      try {
        res.write(data);
      } catch (error) {
        // Remove dead connections
        this.connections.delete(res);
      }
    });
  }
}

const cacheManager = new CacheInvalidationManager();

@Controller('api')
export class CacheController {
  @Get('cache-events')
  handleSSE(@Res() res: Response) {
    // Set proper CORS and SSE headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    cacheManager.addConnection(res);
  }
}

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [CacheController],
  providers: [],
  compatibility: '^3.0.0',
})
export class CacheInvalidationPlugin {
  static init() {
    return CacheInvalidationPlugin;
  }

  constructor(private eventBus: EventBus) {
    // Listen for product changes
    this.eventBus.ofType(ProductEvent).subscribe(event => {
      cacheManager.broadcast({
        type: 'product-updated',
        productId: event.entity.id,
        action: event.type
      });
    });

    // Listen for stock changes
    this.eventBus.ofType(StockMovementEvent).subscribe(event => {
      // StockMovementEvent has stockMovements array
      event.stockMovements.forEach(stockMovement => {
        cacheManager.broadcast({
          type: 'stock-changed',
          productVariantId: stockMovement.productVariant.id,
          stockLevel: stockMovement.quantity
        });
      });
    });

    // Listen for variant changes
    this.eventBus.ofType(ProductVariantEvent).subscribe(event => {
      // ProductVariantEvent has entity as an array
      const variants = Array.isArray(event.entity) ? event.entity : [event.entity];
      variants.forEach(variant => {
        cacheManager.broadcast({
          type: 'product-updated',
          productId: variant.productId,
          variantId: variant.id
        });
      });
    });
  }
}

export { cacheManager };
