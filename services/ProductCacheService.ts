/**
 * Product Cache Service
 * 
 * Provides advanced caching for product data with different strategies:
 * - Static data caching (name, description, options)
 * - Stock level caching (frequent refresh)
 * - Asset caching (images)
 * - Progressive loading support
 */

import { Product } from '~/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface ProductCacheConfig {
  staticDataTTL: number;      // 10 minutes for static data
  stockLevelsTTL: number;     // 30 seconds for stock levels
  assetsTTL: number;          // 15 minutes for assets
  maxSize: number;            // Maximum entries in cache
}

class ProductCacheService {
  private static instance: ProductCacheService;
  private cache = new Map<string, CacheEntry<any>>();
  private config: ProductCacheConfig;

  private constructor(config?: Partial<ProductCacheConfig>) {
    this.config = {
      staticDataTTL: config?.staticDataTTL || 10 * 60 * 1000,      // 10 minutes
      stockLevelsTTL: config?.stockLevelsTTL || 30 * 1000,         // 30 seconds
      assetsTTL: config?.assetsTTL || 15 * 60 * 1000,              // 15 minutes
      maxSize: config?.maxSize || 50                               // 50 entries max
    };
  }

  static getInstance(config?: Partial<ProductCacheConfig>): ProductCacheService {
    if (!ProductCacheService.instance) {
      ProductCacheService.instance = new ProductCacheService(config);
    }
    return ProductCacheService.instance;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if entry is still fresh
    if (Date.now() - entry.timestamp > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store data in cache with specific expiry
   */
  set<T>(key: string, data: T, expiry: number = this.config.staticDataTTL): void {
    // Implement LRU by removing oldest entry if at max size
    if (this.cache.size >= this.config.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry
    });
  }

  /**
   * Clear specific cache entry or pattern
   */
  clear(keyOrPattern?: string): void {
    if (!keyOrPattern) {
      // Clear all cache
      this.cache.clear();
      return;
    }

    if (keyOrPattern.includes('*')) {
      // Pattern matching - clear all keys that match pattern
      const pattern = keyOrPattern.replace('*', '');
      for (const key of this.cache.keys()) {
        if (key.startsWith(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear specific key
      this.cache.delete(keyOrPattern);
    }
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for debugging
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      entries: Array.from(this.cache.keys())
    };
  }

  // Product-specific cache methods

  /**
   * Cache static product data (name, description, options)
   */
  cacheStaticProduct(slug: string, product: Product): void {
    // Remove stock-sensitive fields before caching
    const staticData = {
      ...product,
      variants: product.variants?.map(v => ({
        ...v,
        stockLevel: undefined // Never cache stock levels
      }))
    };
    
    this.set(`product:static:${slug}`, staticData, this.config.staticDataTTL);
  }

  /**
   * Get static product data from cache
   */
  getStaticProduct(slug: string): Product | null {
    return this.get(`product:static:${slug}`);
  }

  /**
   * Cache stock levels for a product
   */
  cacheStockLevels(slug: string, stockData: any): void {
    this.set(`product:stock:${slug}`, stockData, this.config.stockLevelsTTL);
  }

  /**
   * Get stock levels from cache
   */
  getStockLevels(slug: string): any | null {
    return this.get(`product:stock:${slug}`);
  }

  /**
   * Cache product assets
   */
  cacheAssets(slug: string, assets: any): void {
    this.set(`product:assets:${slug}`, assets, this.config.assetsTTL);
  }

  /**
   * Get product assets from cache
   */
  getAssets(slug: string): any | null {
    return this.get(`product:assets:${slug}`);
  }

  /**
   * Merge static data with fresh stock levels
   */
  mergeProductWithStock(staticProduct: Product, stockData: any): Product {
    if (!staticProduct?.variants || !stockData?.variants) {
      return staticProduct;
    }

    return {
      ...staticProduct,
      variants: staticProduct.variants.map(staticVariant => {
        const stockVariant = stockData.variants.find((v: any) => v.id === staticVariant.id);
        return {
          ...staticVariant,
          stockLevel: stockVariant?.stockLevel || 0
        };
      })
    };
  }
}

// Export singleton instance
export const productCache = ProductCacheService.getInstance();

// Auto cleanup only when explicitly enabled
let cleanupInterval: NodeJS.Timeout | null = null;

export function enableAutoCleanup(): void {
  if (typeof window !== 'undefined' && !cleanupInterval) {
    cleanupInterval = setInterval(() => {
      productCache.cleanup();
    }, 30000); // Every 30 seconds
  }
}

export function disableAutoCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

export default ProductCacheService;