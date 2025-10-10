/**
 * Shop LocalStorage Caching Service
 * 
 * Implements the caching strategy from SHOP_ARCHITECTURE_PLAN.md:
 * - Product images: 24 hours (rarely change)
 * - Variant images: 24 hours (rarely change)  
 * - Stock data: Never cached (always fresh)
 */

interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

class ShopCache {
  private isClient = typeof window !== 'undefined';

  // Cache keys as specified in the plan
  private getCacheKey(type: 'product_featured' | 'product_gallery' | 'variant_featured' | 'variant_gallery', id: string): string {
    return `${type}_${id}`;
  }

  private setItem(key: string, data: any, expirationMs: number = CACHE_DURATION): void {
    if (!this.isClient) return;

    try {
      const cacheItem: CacheItem = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + expirationMs
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch (_error) {
      console.warn('Failed to cache item:', key, _error);
    }
  }

  private getItem(key: string): any | null {
    if (!this.isClient) return null;

    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const cacheItem: CacheItem = JSON.parse(cached);
      
      // Check if expired
      if (Date.now() > cacheItem.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return cacheItem.data;
    } catch (_error) {
      console.warn('Failed to retrieve cached item:', key, _error);
      return null;
    }
  }

  // Product featured image caching
  cacheProductFeaturedImage(productId: string, imageData: any): void {
    this.setItem(this.getCacheKey('product_featured', productId), imageData);
  }

  getCachedProductFeaturedImage(productId: string): any | null {
    return this.getItem(this.getCacheKey('product_featured', productId));
  }

  // Product gallery caching
  cacheProductGallery(productId: string, galleryData: any): void {
    this.setItem(this.getCacheKey('product_gallery', productId), galleryData);
  }

  getCachedProductGallery(productId: string): any | null {
    return this.getItem(this.getCacheKey('product_gallery', productId));
  }

  // Variant featured image caching
  cacheVariantFeaturedImage(variantId: string, imageData: any): void {
    this.setItem(this.getCacheKey('variant_featured', variantId), imageData);
  }

  getCachedVariantFeaturedImage(variantId: string): any | null {
    return this.getItem(this.getCacheKey('variant_featured', variantId));
  }

  // Variant gallery caching
  cacheVariantGallery(variantId: string, galleryData: any): void {
    this.setItem(this.getCacheKey('variant_gallery', variantId), galleryData);
  }

  getCachedVariantGallery(variantId: string): any | null {
    return this.getItem(this.getCacheKey('variant_gallery', variantId));
  }

  // Cache management
  clearExpiredCache(): void {
    if (!this.isClient) return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Only check our cache keys
        if (key.startsWith('product_') || key.startsWith('variant_')) {
          try {
            const cached = localStorage.getItem(key);
            if (cached) {
              const cacheItem: CacheItem = JSON.parse(cached);
              if (Date.now() > cacheItem.expiresAt) {
                keysToRemove.push(key);
              }
            }
          } catch (_error) {
            // Invalid cache item, remove it
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      if (keysToRemove.length > 0) {
        console.log(`Cleared ${keysToRemove.length} expired cache items`);
      }
    } catch (error) {
      console.warn('Failed to clear expired cache:', error);
    }
  }

  // Get cache statistics
  getCacheStats(): { totalItems: number; totalSize: number; expiredItems: number } {
    if (!this.isClient) return { totalItems: 0, totalSize: 0, expiredItems: 0 };

    let totalItems = 0;
    let totalSize = 0;
    let expiredItems = 0;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Only check our cache keys
        if (key.startsWith('product_') || key.startsWith('variant_')) {
          totalItems++;
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
            
            try {
              const cacheItem: CacheItem = JSON.parse(value);
              if (Date.now() > cacheItem.expiresAt) {
                expiredItems++;
              }
            } catch (_error) {
              expiredItems++;
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return { totalItems, totalSize, expiredItems };
  }

  // Clear all shop cache
  clearAllCache(): void {
    if (!this.isClient) return;

    try {
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('product_') || key.startsWith('variant_'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`Cleared all shop cache (${keysToRemove.length} items)`);
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
    }
  }
}

// Export singleton instance
export const shopCache = new ShopCache();

// Auto-cleanup expired cache on initialization
if (typeof window !== 'undefined') {
  shopCache.clearExpiredCache();
}
