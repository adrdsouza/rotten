/*
 * WHAT IS THIS FILE?
 *
 * The service-worker.ts file is used to have state of the art prefetching.
 * https://qwik.builder.io/qwikcity/prefetching/overview/
 *
 * Qwik uses a service worker to speed up your site and reduce latency, ie, not used in the traditional way of offline.
 * You can also use this file to add more functionality that runs in the service worker.
 */
import { setupServiceWorker } from '@qwik.dev/router/service-worker';

// 🚀 PRESERVE: Original Qwik service worker functionality
setupServiceWorker();

// 🚀 ENHANCED: Add comprehensive caching strategies
// Import cache configuration
const CACHE_NAMES = {
  static: 'damned-designs-static-v1',
  images: 'damned-designs-images-v1',
  api: 'damned-designs-api-v1',
  pages: 'damned-designs-pages-v1'
};

const CACHE_DURATIONS = {
  static: 30 * 24 * 60 * 60 * 1000, // 30 days
  images: 7 * 24 * 60 * 60 * 1000,  // 7 days
  api: 5 * 60 * 1000,                // 5 minutes
  pages: 10 * 60 * 1000              // 10 minutes
};

// Asset patterns for different caching strategies
const CACHE_FIRST_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/,
  /\.(css|js|woff|woff2|ttf|otf)$/,
  /\/assets\/.*\.(jpg|jpeg|png|gif|webp|avif)$/,
  /\/favicon/,
  /\/manifest\.json$/,
  /\/logo-/
];

// CRITICAL: Patterns that should NEVER be cached (real-time stock data)
const NEVER_CACHE_PATTERNS = [
  /\/shop-api.*stockLevel/,
  /\/shop-api.*inventory/,
  /\/shop-api.*inStock/,
  /\/shop-api.*product.*stockLevel/,
  /\/shop-api.*mutation/,
  /\/admin-api/,
  /\/shop-api.*cart/,
  /\/shop-api.*order/
];

const NETWORK_FIRST_PATTERNS = [
  /\/shop-api/,
  /\/api\//
];

const STALE_WHILE_REVALIDATE_PATTERNS = [
  /\/shop/,
  /\/products/,
  /\/collections/,
  /^\/$|^\/$/
];

// Helper functions
const shouldNeverCache = (url: string): boolean => {
  return NEVER_CACHE_PATTERNS.some(pattern => pattern.test(url));
};

const isCacheFirstAsset = (url: string): boolean => {
  return CACHE_FIRST_PATTERNS.some(pattern => pattern.test(url));
};

const isNetworkFirstAsset = (url: string): boolean => {
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(url)) && !shouldNeverCache(url);
};

const isStaleWhileRevalidateAsset = (url: string): boolean => {
  return STALE_WHILE_REVALIDATE_PATTERNS.some(pattern => pattern.test(url));
};

// 🚀 ENHANCED: Cache management functions
const isExpired = (timestamp: number, maxAge: number): boolean => {
  return Date.now() - timestamp > maxAge;
};

const addToCache = async (cacheName: string, request: Request, response: Response): Promise<void> => {
  try {
    const cache = await caches.open(cacheName);
    const responseToCache = response.clone();

    // Add timestamp for expiration checking
    const responseWithTimestamp = new Response(responseToCache.body, {
      status: responseToCache.status,
      statusText: responseToCache.statusText,
      headers: {
        ...Object.fromEntries(responseToCache.headers.entries()),
        'sw-cached-at': Date.now().toString()
      }
    });

    await cache.put(request, responseWithTimestamp);
  } catch (error) {
    console.warn('Failed to cache response:', error);
  }
};

const getCachedResponse = async (cacheName: string, request: Request, maxAge: number): Promise<Response | null> => {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (!cachedResponse) return null;

    const cachedAt = cachedResponse.headers.get('sw-cached-at');
    if (cachedAt && isExpired(parseInt(cachedAt), maxAge)) {
      // Remove expired cache entry
      await cache.delete(request);
      return null;
    }

    return cachedResponse;
  } catch (error) {
    console.warn('Failed to get cached response:', error);
    return null;
  }
};

// 🚀 ENHANCED: Comprehensive fetch handler (works alongside Qwik's handler)
addEventListener('fetch', (event: any) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // CRITICAL: Never cache real-time stock data
  if (shouldNeverCache(url)) {
    return; // Let it go to network (preserves real-time stock accuracy)
  }

  // Cache-first strategy for static assets
  if (isCacheFirstAsset(url)) {
    event.respondWith(
      getCachedResponse(CACHE_NAMES.static, event.request, CACHE_DURATIONS.static)
        .then(cachedResponse => {
          if (cachedResponse) return cachedResponse;

          return fetch(event.request).then(response => {
            if (response.ok) {
              addToCache(CACHE_NAMES.static, event.request, response);
            }
            return response;
          });
        })
        .catch(() => fetch(event.request))
    );
    return;
  }

  // Network-first strategy for API calls (non-stock data)
  if (isNetworkFirstAsset(url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            addToCache(CACHE_NAMES.api, event.request, response);
          }
          return response;
        })
        .catch(() => {
          return getCachedResponse(CACHE_NAMES.api, event.request, CACHE_DURATIONS.api)
            .then(cachedResponse => cachedResponse || fetch(event.request));
        })
    );
    return;
  }

  // Stale-while-revalidate for pages
  if (isStaleWhileRevalidateAsset(url)) {
    event.respondWith(
      getCachedResponse(CACHE_NAMES.pages, event.request, CACHE_DURATIONS.pages)
        .then(cachedResponse => {
          const fetchPromise = fetch(event.request).then(response => {
            if (response.ok) {
              addToCache(CACHE_NAMES.pages, event.request, response);
            }
            return response;
          });

          return cachedResponse || fetchPromise;
        })
        .catch(() => fetch(event.request))
    );
    return;
  }
});

// 🚀 PRESERVE: Original Qwik event handlers
addEventListener('install', () => self.skipWaiting());
addEventListener('activate', () => self.clients.claim());

declare const self: ServiceWorkerGlobalScope;
