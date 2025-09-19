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

setupServiceWorker();

addEventListener('install', () => self.skipWaiting());

addEventListener('activate', () => self.clients.claim());

// 🚀 ADVANCED CACHING: Product data and asset prefetching
const PRODUCT_CACHE = 'rotten-hand-products-v1';
const ASSET_CACHE = 'rotten-hand-assets-v1';

// Cache GraphQL responses for product data (excluding stock)
self.addEventListener('fetch', (event: any) => {
  const request = event.request;
  const url = new URL(request.url);

  // Cache GraphQL product queries (but not stock data)
  if (url.pathname === '/shop-api/graphql' && request.method === 'POST') {
    event.respondWith(handleGraphQLRequest(request));
  }

  // Cache product assets with longer TTL
  if (url.pathname.includes('/assets/') &&
      (url.pathname.includes('.jpg') || url.pathname.includes('.webp') || url.pathname.includes('.png'))) {
    event.respondWith(handleAssetRequest(request));
  }
});

async function handleGraphQLRequest(request: Request) {
  try {
    const body = await request.clone().text();
    const query = JSON.parse(body);

    // Only cache static product queries (not stock or cart queries)
    if (query.query && query.query.includes('product(slug:') &&
        !query.query.includes('stockLevel') &&
        !query.query.includes('activeOrder')) {

      const cache = await caches.open(PRODUCT_CACHE);
      const cacheKey = `${request.url}#${JSON.stringify(query)}`;

      // Try cache first
      const cached = await cache.match(cacheKey);
      if (cached) {
        const cacheTime = cached.headers.get('sw-cache-time');
        const now = Date.now();

        // Use cached version if less than 5 minutes old
        if (cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          return cached;
        }
      }

      // Fetch fresh data
      const response = await fetch(request);
      if (response.ok) {
        const responseClone = response.clone();
        const headers = new Headers(responseClone.headers);
        headers.set('sw-cache-time', Date.now().toString());

        const cachedResponse = new Response(await responseClone.text(), {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers: headers
        });

        cache.put(cacheKey, cachedResponse);
      }

      return response;
    }
  } catch (_error) {
    // Fall through to normal fetch
  }

  return fetch(request);
}

async function handleAssetRequest(request: Request) {
  const cache = await caches.open(ASSET_CACHE);

  // Try cache first
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  // Fetch and cache
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }

  return response;
}

declare const self: ServiceWorkerGlobalScope;
