/**
 * Validation Cache Debug/Monitoring Utility
 * 
 * Provides utilities for monitoring cache performance and debugging cache behavior.
 */

import { getValidationCacheStats } from './validation-cache';

/**
 * Log cache statistics to console
 */
export function logCacheStats(): void {
  const stats = getValidationCacheStats();
  console.group('🗄️ Validation Cache Statistics');
  console.log('Cache size:', stats.size, '/', stats.maxSize);
  console.log('TTL:', stats.ttl, 'ms');
  console.log('Cached entries:', stats.entries);
  console.groupEnd();
}

/**
 * Monitor cache hit rates
 */
class CacheHitMonitor {
  private hits = 0;
  private misses = 0;

  recordHit(): void {
    this.hits++;
  }

  recordMiss(): void {
    this.misses++;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : this.hits / total;
  }

  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      total: this.hits + this.misses,
      hitRate: this.getHitRate()
    };
  }

  reset(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// Global monitor instance
const cacheMonitor = new CacheHitMonitor();

/**
 * Record cache hit for monitoring
 */
export function recordCacheHit(): void {
  cacheMonitor.recordHit();
}

/**
 * Record cache miss for monitoring
 */
export function recordCacheMiss(): void {
  cacheMonitor.recordMiss();
}

/**
 * Get cache hit rate statistics
 */
export function getCacheHitRateStats() {
  return cacheMonitor.getStats();
}

/**
 * Log cache performance summary
 */
export function logCachePerformance(): void {
  const hitStats = getCacheHitRateStats();
  const cacheStats = getValidationCacheStats();
  
  console.group('⚡ Validation Cache Performance');
  console.log('Hit Rate:', `${(hitStats.hitRate * 100).toFixed(1)}%`);
  console.log('Hits:', hitStats.hits);
  console.log('Misses:', hitStats.misses);
  console.log('Current cache size:', cacheStats.size);
  console.groupEnd();
}

/**
 * Reset cache monitoring
 */
export function resetCacheMonitoring(): void {
  cacheMonitor.reset();
}

// Auto-log performance only when explicitly enabled (not by default)
// This prevents performance overhead on non-checkout pages
let performanceLoggingInterval: NodeJS.Timeout | null = null;

export function enablePerformanceLogging(): void {
  if (typeof window !== 'undefined' && import.meta.env.DEV && !performanceLoggingInterval) {
    performanceLoggingInterval = setInterval(() => {
      const stats = getCacheHitRateStats();
      if (stats.total > 0) {
        logCachePerformance();
      }
    }, 30000);
  }
}

export function disablePerformanceLogging(): void {
  if (performanceLoggingInterval) {
    clearInterval(performanceLoggingInterval);
    performanceLoggingInterval = null;
  }
}
