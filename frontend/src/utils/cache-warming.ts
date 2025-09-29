// 🚀 ADVANCED CACHING: Background cache warming for optimal performance
import { $ } from '@qwik.dev/core';
// Shop image - optimized
import ShopImageAvif from '~/media/shop.jpg?format=avif&width=800&quality=85&url';

// Cache warming configuration
const CACHE_WARMING_CONFIG = {
  // Products to prefetch in background
  PRIORITY_PRODUCTS: ['shortsleeveshirt', 'longsleeveshirt'],
  
  // Assets to prefetch - optimized images
  PRIORITY_ASSETS: [
    ShopImageAvif, // Optimized shop image
    '/fonts/inter/inter-v19-latin-regular.woff2',
    '/fonts/inter/inter-v19-latin-500.woff2',
    '/fonts/playfair-display/playfair-display-v37-latin-regular.woff2',
    '/fonts/playfair-display/playfair-display-v37-latin-700.woff2'
  ],
  
  // Timing configuration - optimized for faster loading
  WARM_DELAY: 500, // Wait 500ms after page load (reduced from 2s)
  PREFETCH_TIMEOUT: 2000, // Max 2s per prefetch (reduced from 5s)
};

// 🚀 SMART PREFETCHING: Only prefetch likely-to-be-needed resources
export const warmProductCache = $(() => {
  if (typeof window === 'undefined') return;
  
  // Don't prefetch on slow connections
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      console.log('🚀 Cache warming skipped: slow connection detected');
      return;
    }
  }
  
  // Don't prefetch if user has data saver enabled
  if ('connection' in navigator && (navigator as any).connection?.saveData) {
    console.log('🚀 Cache warming skipped: data saver enabled');
    return;
  }
  
  setTimeout(() => {
    console.log('🚀 Starting background cache warming...');
    
    // Warm product data cache
    CACHE_WARMING_CONFIG.PRIORITY_PRODUCTS.forEach(slug => {
      prefetchProductData(slug);
    });
    
    // Warm asset cache
    CACHE_WARMING_CONFIG.PRIORITY_ASSETS.forEach(asset => {
      prefetchAsset(asset);
    });
  }, CACHE_WARMING_CONFIG.WARM_DELAY);
});

// Prefetch product data in background
const prefetchProductData = async (slug: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CACHE_WARMING_CONFIG.PREFETCH_TIMEOUT);
    
    const query = `
      query PrefetchProduct($slug: String!) {
        product(slug: $slug) {
          id
          name
          slug
          description
          variants {
            id
            name
            priceWithTax
            currencyCode
            options {
              id
              name
              group {
                id
                code
                name
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch('/shop-api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { slug } }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      console.log(`🚀 Cache warmed: product ${slug}`);
    }
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.log(`🚀 Cache warming failed for ${slug}:`, error);
    }
  }
};

// Prefetch assets in background
const prefetchAsset = async (assetUrl: string) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CACHE_WARMING_CONFIG.PREFETCH_TIMEOUT);
    
    await fetch(assetUrl, {
      signal: controller.signal,
      mode: 'no-cors' // Allow cross-origin prefetching
    });

    clearTimeout(timeoutId);
    console.log(`🚀 Cache warmed: asset ${assetUrl}`);
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      console.log(`🚀 Cache warming failed for ${assetUrl}:`, error);
    }
  }
};

// 🚀 INTELLIGENT PREFETCHING: Prefetch based on user behavior
export const prefetchOnHover = $((productSlug: string) => {
  // Prefetch product assets when user hovers over style buttons
  if (typeof window === 'undefined') return;
  
  // Debounce to avoid excessive prefetching
  const prefetchKey = `prefetch_${productSlug}`;
  if ((window as any)[prefetchKey]) return;
  (window as any)[prefetchKey] = true;
  
  // Prefetch product assets
  setTimeout(() => {
    fetch(`/shop-api/graphql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query PrefetchAssets($slug: String!) {
            product(slug: $slug) {
              featuredAsset {
                id
                preview
              }
              assets {
                id
                preview
              }
            }
          }
        `,
        variables: { slug: productSlug }
      })
    }).then(response => {
      if (response.ok) {
        console.log(`🚀 Prefetched assets for ${productSlug}`);
      }
    }).catch(() => {
      // Silent fail for prefetching
    });
  }, 100);
});

// 🚀 CACHE MANAGEMENT: Clean up old cache entries
export const cleanupCache = $(() => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  
  // Clean up old service worker caches
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      if (cacheName.includes('rotten-hand') && !cacheName.includes('v1')) {
        console.log(`🚀 Cleaning up old cache: ${cacheName}`);
        caches.delete(cacheName);
      }
    });
  });
});
