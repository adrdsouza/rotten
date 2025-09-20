import type { EligibleShippingMethodsQuery } from '~/generated/graphql';

/**
 * Cache Service for optimizing checkout performance
 * Provides caching for shipping methods and address validation
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface ShippingMethodsCacheKey {
  countryCode: string;
  postalCode: string;
  orderTotal: number;
}

interface AddressValidationCacheKey {
  streetLine1: string;
  city: string;
  countryCode: string;
  postalCode: string;
}

export class CacheService {
  private static readonly SHIPPING_METHODS_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly ADDRESS_VALIDATION_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly MAX_CACHE_SIZE = 100; // Prevent memory bloat

  private static shippingMethodsCache = new Map<string, CacheEntry<EligibleShippingMethodsQuery['eligibleShippingMethods']>>();
  private static addressValidationCache = new Map<string, CacheEntry<boolean>>();

  /**
   * Generate cache key for shipping methods
   */
  private static generateShippingMethodsKey(key: ShippingMethodsCacheKey): string {
    return `shipping:${key.countryCode}:${key.postalCode}:${Math.floor(key.orderTotal / 100)}`; // Round to nearest dollar for better cache hits
  }

  /**
   * Generate cache key for address validation
   */
  private static generateAddressValidationKey(key: AddressValidationCacheKey): string {
    return `address:${key.countryCode}:${key.postalCode}:${key.city}:${key.streetLine1.substring(0, 20)}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private static isValidEntry<T>(entry: CacheEntry<T>): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * Clean expired entries from cache
   */
  private static cleanExpiredEntries<T>(cache: Map<string, CacheEntry<T>>): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now >= entry.expiresAt) {
        cache.delete(key);
      }
    }
  }

  /**
   * Ensure cache doesn't exceed maximum size
   */
  private static enforceCacheSize<T>(cache: Map<string, CacheEntry<T>>): void {
    if (cache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries (simple LRU-like behavior)
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, cache.size - this.MAX_CACHE_SIZE + 10); // Remove extra to avoid frequent cleanup
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }

  /**
   * Cache shipping methods for a specific address and order total
   */
  static cacheShippingMethods(
    key: ShippingMethodsCacheKey,
    shippingMethods: EligibleShippingMethodsQuery['eligibleShippingMethods']
  ): void {
    this.cleanExpiredEntries(this.shippingMethodsCache);
    this.enforceCacheSize(this.shippingMethodsCache);

    const cacheKey = this.generateShippingMethodsKey(key);
    const entry: CacheEntry<EligibleShippingMethodsQuery['eligibleShippingMethods']> = {
      data: shippingMethods,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.SHIPPING_METHODS_TTL
    };

    this.shippingMethodsCache.set(cacheKey, entry);
    console.log(`📦 Cached shipping methods for ${key.countryCode}-${key.postalCode}`);
  }

  /**
   * Get cached shipping methods if available and valid
   */
  static getCachedShippingMethods(
    key: ShippingMethodsCacheKey
  ): EligibleShippingMethodsQuery['eligibleShippingMethods'] | null {
    const cacheKey = this.generateShippingMethodsKey(key);
    const entry = this.shippingMethodsCache.get(cacheKey);

    if (entry && this.isValidEntry(entry)) {
      console.log(`🎯 Cache hit for shipping methods: ${key.countryCode}-${key.postalCode}`);
      return entry.data;
    }

    if (entry) {
      // Remove expired entry
      this.shippingMethodsCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache address validation result
   */
  static cacheAddressValidation(key: AddressValidationCacheKey, isValid: boolean): void {
    this.cleanExpiredEntries(this.addressValidationCache);
    this.enforceCacheSize(this.addressValidationCache);

    const cacheKey = this.generateAddressValidationKey(key);
    const entry: CacheEntry<boolean> = {
      data: isValid,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ADDRESS_VALIDATION_TTL
    };

    this.addressValidationCache.set(cacheKey, entry);
    console.log(`📍 Cached address validation for ${key.countryCode}-${key.postalCode}`);
  }

  /**
   * Get cached address validation result if available and valid
   */
  static getCachedAddressValidation(key: AddressValidationCacheKey): boolean | null {
    const cacheKey = this.generateAddressValidationKey(key);
    const entry = this.addressValidationCache.get(cacheKey);

    if (entry && this.isValidEntry(entry)) {
      console.log(`🎯 Cache hit for address validation: ${key.countryCode}-${key.postalCode}`);
      return entry.data;
    }

    if (entry) {
      // Remove expired entry
      this.addressValidationCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Clear all caches (useful for testing or when user logs out)
   */
  static clearAllCaches(): void {
    this.shippingMethodsCache.clear();
    this.addressValidationCache.clear();
    console.log('🧹 All caches cleared');
  }

  /**
   * Get cache statistics for monitoring
   */
  static getCacheStats() {
    return {
      shippingMethods: {
        size: this.shippingMethodsCache.size,
        maxSize: this.MAX_CACHE_SIZE
      },
      addressValidation: {
        size: this.addressValidationCache.size,
        maxSize: this.MAX_CACHE_SIZE
      }
    };
  }

  /**
   * Cache address validation results with enhanced key generation
   */
  static cacheEnhancedAddressValidation(address: any, validationResult: any): void {
    const key = this.generateEnhancedAddressValidationKey(address);
    const entry: CacheEntry<any> = {
      data: validationResult,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.ADDRESS_VALIDATION_TTL
    };
    
    this.cleanExpiredEntries(this.addressValidationCache);
    this.enforceCacheSize(this.addressValidationCache);
    this.addressValidationCache.set(key, entry);
    console.log(`📍 Enhanced cached address validation for ${address.countryCode}-${address.postalCode}`);
  }

  /**
   * Get cached enhanced address validation result
   */
  static getCachedEnhancedAddressValidation(address: any): any | null {
    const key = this.generateEnhancedAddressValidationKey(address);
    const entry = this.addressValidationCache.get(key);
    
    if (entry && this.isValidEntry(entry)) {
      console.log(`🎯 Cache hit for enhanced address validation: ${address.countryCode}-${address.postalCode}`);
      return entry.data;
    }
    
    if (entry) {
      this.addressValidationCache.delete(key);
    }
    
    return null;
  }

  /**
   * Generate enhanced cache key for address validation
   */
  private static generateEnhancedAddressValidationKey(address: any): string {
    const keyData = {
      streetLine1: address.streetLine1 || '',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      countryCode: address.countryCode || ''
    };
    return `enhanced_addr_validation_${JSON.stringify(keyData)}`;
  }
}