interface CachedProduct {
  productId: string;
  productName: string;
  slug: string;
  description?: string;
  productAsset: {
    id: string;
    preview: string;
  } | null;
  assets?: Array<{
    id: string;
    preview: string;
  }>;
  inStock: boolean;
  priceWithTax: {
    min?: number;
    max?: number;
    value?: number;
  };
  facetValues?: Array<{
    id: string;
    code: string;
    name: string;
    facet: {
      id: string;
      code: string;
      name: string;
    };
  }>;
  // Add variant data caching
  variants?: Array<{
    id: string;
    name: string;
    stockLevel: string;
    priceWithTax?: number;
    currencyCode?: string;
    customFields?: {
      salePrice?: number;
      preOrderPrice?: number;
      shipDate?: string;
    };
  }>;
  lastUpdated: number;
  // Timestamp for when variant data was last updated
  variantDataLastUpdated?: number;
}

interface ProductCache {
  products: Record<string, CachedProduct>;
  lastCacheUpdate: number;
  cacheVersion: string;
  // Cache statistics for monitoring
  stats?: {
    hits: number;
    misses: number;
    variantHits: number;
    variantMisses: number;
    errors: number;
    lastError?: string;
    lastErrorTime?: number;
  };
}

export class ProductCacheService {
  private static readonly CACHE_KEY = 'shop_products_cache';
  private static readonly VARIANT_CACHE_KEY = 'shop_variants_cache';
  private static readonly MAX_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year (effectively forever)
  private static readonly VARIANT_CACHE_AGE = 5 * 60 * 1000; // 5 minutes for variant data
  private static readonly CACHE_VERSION = '2.0'; // Updated for variant support
  private static readonly DEBUG_ENABLED = process.env.NODE_ENV === 'development';
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;
  private static readonly NETWORK_TIMEOUT = 10000; // 10 seconds
  private static readonly CORRUPTION_THRESHOLD = 5; // Max corruption events before full reset
  
  // Error tracking
  private static corruptionCount = 0;
  private static lastCorruptionTime = 0;
  private static networkFailureCount = 0;
  private static lastNetworkFailure = 0;
  
  static getCachedProducts(): ProductCache | null {
    try {
      if (!this.isStorageAvailable()) {
        this.logDebug('LocalStorage not available');
        return null;
      }

      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const cache = JSON.parse(cached) as ProductCache;
        
        // Validate cache structure
        if (!cache.products || !cache.cacheVersion || !cache.lastCacheUpdate) {
          this.logError('Cache structure is corrupted', 'Invalid cache structure');
          this.recordCorruption(new Error('Invalid cache structure'));
          return null;
        }
        
        // Check if cache version is compatible (primary invalidation method)
        if (cache.cacheVersion !== this.CACHE_VERSION) {
          this.logDebug(`Cache version mismatch: ${cache.cacheVersion} vs ${this.CACHE_VERSION}`);
          this.clearCache();
          return null;
        }
        
        // Time-based check as safety net only
        const now = Date.now();
        if (now - cache.lastCacheUpdate > this.MAX_CACHE_AGE) {
          this.logDebug('Cache expired due to age');
          this.clearCache();
          return null;
        }
        
        // Perform integrity validation
        const validation = this.validateCacheIntegrity();
        if (!validation.isValid) {
          this.logError('Cache integrity validation failed', validation.errors);
          this.recordCorruption(new Error(`Cache integrity validation failed: ${validation.errors.join(', ')}`));
          return null;
        }
        
        this.incrementStat('hits');
        return cache;
      }
      
      this.incrementStat('misses');
    } catch (error) {
      this.logError('Failed to parse product cache', error);
      
      // Check if this is a corruption error
      if (this.detectCorruption(error)) {
        this.recordCorruption(error);
      } else {
        this.clearCache();
      }
    }
    return null;
  }
  
  static saveProductsToCache(products: CachedProduct[]): void {
    try {
      if (!this.isStorageAvailable()) {
        this.logDebug('LocalStorage not available for saving');
        return;
      }

      const existingCache = this.getCachedProducts();
      const cache: ProductCache = {
        products: products.reduce((acc, product) => {
          acc[product.productId] = {
            ...product,
            lastUpdated: Date.now()
          };
          return acc;
        }, {} as Record<string, CachedProduct>),
        lastCacheUpdate: Date.now(),
        cacheVersion: this.CACHE_VERSION,
        stats: existingCache?.stats || { hits: 0, misses: 0, variantHits: 0, variantMisses: 0, errors: 0 }
      };
      
      // Use safe storage method
      if (this.saveCacheToStorage(cache)) {
        this.logDebug(`Saved ${products.length} products to cache`);
      } else {
        this.logError('Failed to save cache using safe storage method', 'Storage failed');
      }
    } catch (error) {
      this.logError('Failed to save product cache', error);
      
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        this.logError('Storage quota exceeded, clearing cache and retrying', error);
        this.clearCache();
        try {
          const cache: ProductCache = {
            products: products.reduce((acc, product) => {
              acc[product.productId] = {
                ...product,
                lastUpdated: Date.now()
              };
              return acc;
            }, {} as Record<string, CachedProduct>),
            lastCacheUpdate: Date.now(),
            cacheVersion: this.CACHE_VERSION,
            stats: { hits: 0, misses: 0, variantHits: 0, variantMisses: 0, errors: 0 }
          };
          this.saveCacheToStorage(cache);
        } catch (retryError) {
          this.logError('Failed to save cache even after clearing', retryError);
        }
      }
    }
  }
  
  // New methods for variant data caching
  static updateProductCacheWithVariants(productId: string, variants: any[]): void {
    try {
      const cache = this.getCachedProducts();
      if (cache && cache.products[productId]) {
        cache.products[productId].variants = variants.map(v => ({
          id: v.id,
          name: v.name,
          stockLevel: v.stockLevel,
          priceWithTax: v.priceWithTax,
          currencyCode: v.currencyCode,
          customFields: v.customFields
        }));
        cache.products[productId].variantDataLastUpdated = Date.now();
        cache.lastCacheUpdate = Date.now();
        
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
        this.logDebug(`Updated variant data for product ${productId}`);
      }
    } catch (error) {
      this.logError('Failed to update product cache with variants', error);
    }
  }

  static getCachedProductVariants(productId: string): any[] | null {
    try {
      const cache = this.getCachedProducts();
      if (cache && cache.products[productId]) {
        const product = cache.products[productId];
        
        // Check if variant data is fresh (within 5 minutes)
        if (product.variants && product.variantDataLastUpdated) {
          const now = Date.now();
          if (now - product.variantDataLastUpdated <= this.VARIANT_CACHE_AGE) {
            this.incrementStat('variantHits');
            return product.variants;
          }
        }
      }
      
      this.incrementStat('variantMisses');
    } catch (error) {
      this.logError('Failed to get cached product variants', error);
    }
    return null;
  }

  static isVariantDataFresh(productId: string): boolean {
    try {
      const cache = this.getCachedProducts();
      if (cache && cache.products[productId]) {
        const product = cache.products[productId];
        if (product.variantDataLastUpdated) {
          const now = Date.now();
          return now - product.variantDataLastUpdated <= this.VARIANT_CACHE_AGE;
        }
      }
    } catch (error) {
      this.logError('Failed to check variant data freshness', error);
    }
    return false;
  }

  static clearCache(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.VARIANT_CACHE_KEY);
      this.logDebug('Cache cleared');
    } catch (error) {
      this.logError('Failed to clear product cache', error);
    }
  }
  
  // Primary invalidation method - call when products change
  static invalidateCache(): void {
    this.clearCache();
  }

  // Enhanced invalidation with specific reasons
  static invalidateCacheWithReason(reason: string): void {
    this.logDebug(`Cache invalidated: ${reason}`);
    this.clearCache();
  }
  
  // Check if localStorage is available
  static isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
  
  // Helper methods for logging and statistics
  private static logDebug(message: string): void {
    if (this.DEBUG_ENABLED) {
      console.log(`[ProductCache] ${message}`);
    }
  }

  private static logError(message: string, error: any): void {
    console.error(`[ProductCache] ${message}:`, error);
    this.incrementStat('errors');
    
    // Update error stats
    try {
      const cache = this.getCachedProducts();
      if (cache) {
        if (!cache.stats) cache.stats = { hits: 0, misses: 0, variantHits: 0, variantMisses: 0, errors: 0 };
        cache.stats.lastError = typeof error === 'string' ? error : error?.message || 'Unknown error';
        cache.stats.lastErrorTime = Date.now();
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (_e) {
      // Ignore errors when trying to log errors to avoid infinite loops
    }
  }

  private static incrementStat(stat: 'hits' | 'misses' | 'variantHits' | 'variantMisses' | 'errors'): void {
    try {
      const cache = this.getCachedProducts();
      if (cache) {
        if (!cache.stats) {
          cache.stats = { hits: 0, misses: 0, variantHits: 0, variantMisses: 0, errors: 0 };
        }
        cache.stats[stat]++;
        localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      }
    } catch (_error) {
      // Ignore errors when updating stats to avoid infinite loops
    }
  }

  // Get cache statistics for debugging
  static getCacheStats(): { size: number; productCount: number; lastUpdate: number | null; stats?: any } {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const cache = JSON.parse(cached) as ProductCache;
        return {
          size: new Blob([cached]).size,
          productCount: Object.keys(cache.products).length,
          lastUpdate: cache.lastCacheUpdate,
          stats: cache.stats
        };
      }
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }
    return { size: 0, productCount: 0, lastUpdate: null };
  }

  // Deep data comparison for variant changes
  static compareVariantData(cached: any[], fresh: any[]): {
    hasChanges: boolean;
    stockChanges: Array<{ variantId: string; oldStock: string; newStock: string }>;
    priceChanges: Array<{ variantId: string; oldPrice: number; newPrice: number }>;
    newVariants: any[];
    missingVariants: any[];
  } {
    const result = {
      hasChanges: false,
      stockChanges: [] as Array<{ variantId: string; oldStock: string; newStock: string }>,
      priceChanges: [] as Array<{ variantId: string; oldPrice: number; newPrice: number }>,
      newVariants: [] as any[],
      missingVariants: [] as any[]
    };

    // Check for new variants
    for (const freshVariant of fresh) {
      const cachedVariant = cached.find(v => v.id === freshVariant.id);
      if (!cachedVariant) {
        result.newVariants.push(freshVariant);
        result.hasChanges = true;
      } else {
        // Check for stock changes
        if (cachedVariant.stockLevel !== freshVariant.stockLevel) {
          result.stockChanges.push({
            variantId: freshVariant.id,
            oldStock: cachedVariant.stockLevel,
            newStock: freshVariant.stockLevel
          });
          result.hasChanges = true;
        }
        
        // Check for price changes
        if (cachedVariant.priceWithTax !== freshVariant.priceWithTax) {
          result.priceChanges.push({
            variantId: freshVariant.id,
            oldPrice: cachedVariant.priceWithTax || 0,
            newPrice: freshVariant.priceWithTax || 0
          });
          result.hasChanges = true;
        }
      }
    }

    // Check for missing variants
    for (const cachedVariant of cached) {
      if (!fresh.find(v => v.id === cachedVariant.id)) {
        result.missingVariants.push(cachedVariant);
        result.hasChanges = true;
      }
    }

    return result;
  }

  static compareProductData(cached: any, fresh: any): {
    hasChanges: boolean;
    changes: string[];
  } {
    const result = {
      hasChanges: false,
      changes: [] as string[]
    };

    // Compare description
    if (cached.description !== fresh.description) {
      result.changes.push('description');
      result.hasChanges = true;
    }

    // Compare assets
    const cachedAssets = cached.assets || [];
    const freshAssets = fresh.assets || [];
    if (cachedAssets.length !== freshAssets.length || 
        !cachedAssets.every((asset: any, index: number) => 
          freshAssets[index] && asset.id === freshAssets[index].id)) {
      result.changes.push('assets');
      result.hasChanges = true;
    }

    // Compare facet values
    const cachedFacets = cached.facetValues || [];
    const freshFacets = fresh.facetValues || [];
    if (cachedFacets.length !== freshFacets.length ||
        !cachedFacets.every((facet: any) => 
          freshFacets.find((f: any) => f.id === facet.id))) {
      result.changes.push('facetValues');
      result.hasChanges = true;
    }

    return result;
  }

  // Legacy boolean comparison for backward compatibility
  static compareVariantDataBoolean(cached: any[], fresh: any[]): boolean {
    if (!cached || !fresh || cached.length !== fresh.length) {
      return false;
    }

    // Create maps for efficient comparison
    const cachedMap = new Map(cached.map(v => [v.id, v]));
    const freshMap = new Map(fresh.map(v => [v.id, v]));

    // Check if all variant IDs match
    if (cachedMap.size !== freshMap.size) {
      return false;
    }

    // Compare critical properties for each variant
    for (const [id, freshVariant] of freshMap) {
      const cachedVariant = cachedMap.get(id);
      if (!cachedVariant) {
        return false;
      }

      // Compare critical properties
      const criticalProps = ['name', 'stockLevel', 'priceWithTax', 'currencyCode'];
      for (const prop of criticalProps) {
        if (cachedVariant[prop] !== freshVariant[prop]) {
          return false;
        }
      }

      // Compare custom fields if they exist
      if (cachedVariant.customFields || freshVariant.customFields) {
        const cachedCustom = cachedVariant.customFields || {};
        const freshCustom = freshVariant.customFields || {};
        
        const customProps = ['salePrice', 'preOrderPrice', 'shipDate'];
        for (const prop of customProps) {
          if (cachedCustom[prop] !== freshCustom[prop]) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Validate cache integrity
  static validateCacheIntegrity(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const cache = this.getCachedProducts();
      if (!cache) {
        return { isValid: true, errors: [] }; // No cache is valid
      }

      // Check cache structure
      if (!cache.products || typeof cache.products !== 'object') {
        errors.push('Invalid products structure');
      }

      if (!cache.cacheVersion || typeof cache.cacheVersion !== 'string') {
        errors.push('Invalid cache version');
      }

      if (!cache.lastCacheUpdate || typeof cache.lastCacheUpdate !== 'number') {
        errors.push('Invalid last cache update timestamp');
      }

      // Check individual products
      for (const [productId, product] of Object.entries(cache.products)) {
        if (!product.productId || !product.productName || !product.slug) {
          errors.push(`Product ${productId} missing required fields`);
        }

        if (product.variants) {
          for (const variant of product.variants) {
            if (!variant.id || !variant.name || variant.stockLevel === undefined) {
              errors.push(`Product ${productId} has invalid variant data`);
              break;
            }
          }
        }
      }

    } catch (error) {
      errors.push(`Cache validation failed: ${error}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Enhanced network failure detection
  static isNetworkFailure(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString().toLowerCase();
    const networkErrors = [
      'network error',
      'fetch failed',
      'connection refused',
      'timeout',
      'no internet',
      'offline',
      'dns',
      'unreachable',
      'abort'
    ];
    
    return networkErrors.some(keyword => errorMessage.includes(keyword)) ||
           error.name === 'NetworkError' ||
           error.code === 'NETWORK_ERROR' ||
           (error.response && error.response.status >= 500);
  }

  // Track network failures
  static recordNetworkFailure(error: any): void {
    this.networkFailureCount++;
    this.lastNetworkFailure = Date.now();
    this.incrementStat('errors');
    
    const cache = this.getCachedProducts();
    if (cache && cache.stats) {
      cache.stats.lastError = `Network failure: ${error.message || error}`;
      cache.stats.lastErrorTime = Date.now();
      this.saveCacheToStorage(cache);
    }
    
    this.logError('Network failure recorded', error);
  }

  // Check if we should use stale cache due to network issues
  static shouldUseStaleCache(): boolean {
    const recentFailures = this.networkFailureCount > 0 && 
                          (Date.now() - this.lastNetworkFailure) < 30000; // 30 seconds
    const hasStaleData = this.getCachedProducts() !== null;
    
    return recentFailures && hasStaleData;
  }

  // Enhanced corruption detection
  static detectCorruption(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString().toLowerCase();
    const corruptionIndicators = [
      'unexpected token',
      'invalid json',
      'syntax error',
      'parse error',
      'malformed',
      'corrupted',
      'invalid character'
    ];
    
    return corruptionIndicators.some(indicator => errorMessage.includes(indicator)) ||
           error.name === 'SyntaxError' ||
           (error instanceof SyntaxError);
  }

  // Track corruption events
  static recordCorruption(error: any): void {
    this.corruptionCount++;
    this.lastCorruptionTime = Date.now();
    this.incrementStat('errors');
    
    this.logError('Cache corruption detected', error);
    
    // If we've hit the corruption threshold, perform a full reset
    if (this.corruptionCount >= this.CORRUPTION_THRESHOLD) {
      this.logError('Corruption threshold exceeded, performing full cache reset', 
                   `Corruption count: ${this.corruptionCount}`);
      this.performFullReset();
    } else {
      this.recoverFromCorruption();
    }
  }

  // Perform full cache reset
  static performFullReset(): void {
    try {
      localStorage.removeItem(this.CACHE_KEY);
      localStorage.removeItem(this.VARIANT_CACHE_KEY);
      
      // Reset error counters
      this.corruptionCount = 0;
      this.networkFailureCount = 0;
      this.lastCorruptionTime = 0;
      this.lastNetworkFailure = 0;
      
      this.logDebug('Full cache reset completed');
    } catch (error) {
      this.logError('Failed to perform full cache reset', error);
    }
  }

  // Enhanced recovery method for corrupted cache
  static recoverFromCorruption(): void {
    this.logError('Cache corruption detected, attempting recovery', 'Cache corruption');
    
    let recoveryAttempt = 0;
    
    while (recoveryAttempt < this.MAX_RECOVERY_ATTEMPTS) {
      try {
        // Try to salvage any valid products
        const cached = localStorage.getItem(this.CACHE_KEY);
        if (cached) {
          const cache = JSON.parse(cached) as ProductCache;
          const validProducts: CachedProduct[] = [];
          
          for (const [_productId, product] of Object.entries(cache.products || {})) {
            if (this.isValidProduct(product)) {
              // Clean up the product data
              validProducts.push(this.sanitizeProduct(product));
            }
          }
          
          if (validProducts.length > 0) {
            this.logDebug(`Recovered ${validProducts.length} valid products from corrupted cache (attempt ${recoveryAttempt + 1})`);
            this.saveProductsToCache(validProducts);
            return;
          }
        }
        break;
      } catch (error) {
        recoveryAttempt++;
        this.logError(`Recovery attempt ${recoveryAttempt} failed`, error);
        
        if (recoveryAttempt >= this.MAX_RECOVERY_ATTEMPTS) {
          this.logError('All recovery attempts failed, clearing cache', error);
          break;
        }
        
        // Wait before next attempt
        setTimeout(() => {}, 100 * recoveryAttempt);
      }
    }
    
    // If recovery fails, clear the cache completely
    this.clearCache();
  }

  // Validate individual product data
  private static isValidProduct(product: any): boolean {
    return product &&
           typeof product === 'object' &&
           product.productId &&
           product.productName &&
           product.slug &&
           typeof product.lastUpdated === 'number';
  }

  // Sanitize product data
  private static sanitizeProduct(product: any): CachedProduct {
    return {
      productId: String(product.productId),
      productName: String(product.productName),
      slug: String(product.slug),
      description: product.description ? String(product.description) : undefined,
      productAsset: product.productAsset || null,
      assets: Array.isArray(product.assets) ? product.assets : undefined,
      inStock: Boolean(product.inStock),
      priceWithTax: product.priceWithTax || { value: 0 },
      facetValues: Array.isArray(product.facetValues) ? product.facetValues : undefined,
      variants: Array.isArray(product.variants) ? product.variants : undefined,
      lastUpdated: Number(product.lastUpdated) || Date.now(),
      variantDataLastUpdated: product.variantDataLastUpdated ? Number(product.variantDataLastUpdated) : undefined
    };
  }

  // Safe cache storage with error handling
  private static saveCacheToStorage(cache: ProductCache): boolean {
    try {
      const cacheString = JSON.stringify(cache);
      
      // Check if the serialized cache is too large
      if (cacheString.length > 5 * 1024 * 1024) { // 5MB limit
        this.logError('Cache size exceeds limit, performing cleanup', `Size: ${cacheString.length}`);
        this.performCacheCleanup(cache);
        return false;
      }
      
      localStorage.setItem(this.CACHE_KEY, cacheString);
      return true;
    } catch (error) {
      if (this.detectCorruption(error)) {
        this.recordCorruption(error);
      } else {
        this.logError('Failed to save cache to storage', error);
      }
      return false;
    }
  }

  // Cleanup old cache entries
  private static performCacheCleanup(cache: ProductCache): void {
    try {
      const now = Date.now();
      const cleanedProducts: Record<string, CachedProduct> = {};
      
      // Keep only recently accessed products
      for (const [productId, product] of Object.entries(cache.products)) {
        if (now - product.lastUpdated < this.MAX_CACHE_AGE / 2) { // Keep products accessed in last 6 months
          cleanedProducts[productId] = product;
        }
      }
      
      const cleanedCache: ProductCache = {
        ...cache,
        products: cleanedProducts,
        lastCacheUpdate: now
      };
      
      this.saveCacheToStorage(cleanedCache);
      this.logDebug(`Cache cleanup completed. Removed ${Object.keys(cache.products).length - Object.keys(cleanedProducts).length} old entries`);
    } catch (error) {
      this.logError('Cache cleanup failed', error);
    }
  }
}

export type { CachedProduct, ProductCache };