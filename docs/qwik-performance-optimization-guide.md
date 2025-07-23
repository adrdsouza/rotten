# Qwik Storefront Performance Optimization Guide

## Overview

This document outlines performance optimizations for the Damned Designs Qwik storefront, comparing current implementation against Qwik best practices and the official Vendure Qwik starter. The recommendations focus on improving loading speed, reducing bundle size, and enhancing user experience.

## Current Implementation Analysis

Based on the codebase review, several optimization opportunities have been identified:

### 1. Prefetching Strategy Issues

The current implementation shows bundle graph warnings due to aggressive prefetching:

```
bundle-graph-CYhc79hI.json was preloaded using link preload but not used within a few seconds
<link rel=modulepreload> has no href value
```

While some fixes have been attempted, the prefetching strategy can be further optimized.

### 2. Build Configuration

The current build configuration has room for improvement in terms of chunk splitting, asset optimization, and tree-shaking.

### 3. Server-Side Rendering and Hydration

The current implementation uses SSR but may not be optimally configured for the fastest possible Time To Interactive (TTI).

## Recommended Optimizations

### 1. Prefetching Strategy Optimization

```typescript
// vite.config.ts
qwikVite({
  prefetchStrategy: {
    implementation: {
      linkInsert: 'js-append', // Non-blocking prefetch insertion
      linkRel: 'prefetch', // More compatible than modulepreload
      workerFetchInsert: null, // Disable worker-based prefetching
      prefetchEvent: 'qvisible', // Only prefetch when visible in viewport
    },
    symbolsToPrefetch: 'intersection-observed', // More conservative prefetching
  },
})
```

**Benefits:**
- Reduces unnecessary network requests
- Prevents console warnings
- Improves mobile performance by reducing bandwidth usage
- Maintains fast navigation for high-intent actions

### 2. Route-Based Code Splitting

```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks(id) {
        // Core Qwik libraries
        if (id.includes('node_modules/@qwik.dev/core') || id.includes('node_modules/@qwik.dev/router')) {
          return 'vendor-qwik';
        }
        
        // UI components library
        if (id.includes('node_modules/@qwik.dev/ui')) {
          return 'vendor-ui';
        }
        
        // Route-based chunking
        if (id.includes('/routes/shop/')) {
          return 'route-shop';
        }
        if (id.includes('/routes/product/')) {
          return 'route-product';
        }
        if (id.includes('/routes/checkout/')) {
          return 'route-checkout';
        }
        
        // Keep shared components separate
        if (id.includes('/components/common/')) {
          return 'components-common';
        }
      }
    }
  }
}
```

**Benefits:**
- Reduces initial load size
- Improves caching efficiency
- Prevents loading checkout code on product pages

### 3. Image Optimization

```typescript
// src/components/Image.tsx
export const OptimizedImage = component$<ImageProps>(({ src, alt, width, height, loading = 'lazy' }) => {
  // Convert to WebP format for supported browsers
  const webpSrc = src.replace(/\.(jpg|jpeg|png)$/, '.webp');
  
  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img 
        src={src} 
        alt={alt} 
        width={width} 
        height={height} 
        loading={loading}
        decoding="async"
        fetchpriority={loading === 'eager' ? 'high' : 'auto'}
      />
    </picture>
  );
});
```

**Implementation:**
1. Add image optimization to build pipeline
2. Convert product images to WebP format
3. Implement responsive image sizes
4. Use proper loading attributes

### 4. Lazy Loading Components

```typescript
// Import lazy$ for component lazy loading
import { component$, useSignal, $, lazy$ } from '@qwik.dev/core';

// Lazy load below-the-fold components
const LazyReviewsSection = lazy$(() => import('./components/ReviewsSection'));
const LazyRelatedProducts = lazy$(() => import('./components/RelatedProducts'));

// In your component
export default component$(() => {
  return (
    <>
      <header>...</header>
      <main>
        <ProductDetails />
        <div data-below-fold>
          <LazyReviewsSection />
          <LazyRelatedProducts />
        </div>
      </main>
    </>
  );
});
```

**Target components for lazy loading:**
- Product reviews
- Related products
- Footer content
- Non-critical UI elements

### 5. Optimize Entry Points

```typescript
// server/entry.express.js
// Optimize server entry point
export default function createServer(options) {
  // Implement response caching for static routes
  const cache = new Map();
  
  return createQwikCity({
    ...options,
    // Add middleware for response caching
    middleware: [
      (req, res, next) => {
        const url = req.url;
        // Skip caching for dynamic routes
        if (url.includes('/api/') || url.includes('/checkout/')) {
          return next();
        }
        
        // Check cache
        const cachedResponse = cache.get(url);
        if (cachedResponse) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(cachedResponse);
          return;
        }
        
        // Store original end method
        const originalEnd = res.end;
        
        // Override end method to cache response
        res.end = function(chunk) {
          if (res.statusCode === 200) {
            cache.set(url, chunk);
          }
          return originalEnd.apply(this, arguments);
        };
        
        next();
      },
      ...options.middleware || []
    ]
  });
}
```

### 6. Implement Resource Hints

```html
<!-- In head section of root.tsx -->
<link rel="dns-prefetch" href="https://damneddesigns.com" />
<link rel="preconnect" href="https://damneddesigns.com" crossorigin />

<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/main-font.woff2" as="font" type="font/woff2" crossorigin />

<!-- Preload hero image on homepage -->
<link rel="preload" href="/images/hero.webp" as="image" />
```

### 7. Optimize PM2 Configuration

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'frontend',
    script: 'pnpm',
    args: 'serve',
    cwd: '/home/vendure/damneddesigns/frontend',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      HOST: '0.0.0.0',
      // Enable Node.js optimizations
      NODE_OPTIONS: '--max-old-space-size=1024 --optimize-for-size',
    },
    instances: 'max', // Use all available CPUs
    exec_mode: 'cluster', // Enable cluster mode for load balancing
    max_memory_restart: '1G',
  }]
};
```

### 8. Implement Service Worker for Caching

```typescript
// src/service-worker.ts
import { setupServiceWorker } from '@qwik.dev/service-worker';

setupServiceWorker({
  cacheFirst: [
    // Cache static assets
    /\.(jpg|jpeg|png|gif|webp|svg|ico)$/,
    /\.(css|js)$/,
    /\.(woff|woff2|ttf|otf)$/,
  ],
  networkFirst: [
    // Dynamic routes that should check network first
    /\/api\//,
    /\/shop\//,
    /\/product\//,
  ],
  // Cache product data for 1 hour
  staleWhileRevalidate: {
    patterns: [/\/api\/products\//],
    maxAgeSeconds: 3600,
  }
});
```

### 9. Optimize GraphQL Queries

```typescript
// src/lib/vendure.ts
// Implement query batching and caching
import { GraphQLClient } from 'graphql-request';
import { QueryCache } from '@tanstack/query-core';

const VENDURE_API_URL = 'http://5.78.142.235:3000/shop-api';
const queryCache = new QueryCache();

export const vendureClient = new GraphQLClient(VENDURE_API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function fetchWithCache(query, variables, cacheTime = 5 * 60 * 1000) {
  const cacheKey = JSON.stringify({ query, variables });
  
  // Check cache
  const cached = queryCache.find({ queryKey: [cacheKey] });
  if (cached && cached.state.data) {
    return cached.state.data;
  }
  
  // Fetch data
  const data = await vendureClient.request(query, variables);
  
  // Cache result
  queryCache.build({
    queryKey: [cacheKey],
    queryFn: () => data,
    staleTime: cacheTime,
    cacheTime: cacheTime,
  });
  
  return data;
}
```

### 10. Implement Resumability Optimization

```typescript
// src/root.tsx
export default component$(() => {
  useStyles$(styles);
  
  // Optimize resumability by avoiding unnecessary state
  useVisibleTask$(() => {
    // Move non-critical initialization here
    console.log('App hydrated');
  });
  
  return (
    <QwikCityProvider>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="manifest" href="/manifest.json" />
        <RouterHead />
      </head>
      <body lang="en">
        <RouterOutlet />
      </body>
    </QwikCityProvider>
  );
});
```

## Performance Metrics to Monitor

After implementing these optimizations, monitor the following metrics:

1. **Lighthouse Performance Score**: Target 90+ on mobile
2. **Core Web Vitals**:
   - LCP (Largest Contentful Paint): < 2.5s
   - FID (First Input Delay): < 100ms
   - CLS (Cumulative Layout Shift): < 0.1
3. **Time to Interactive (TTI)**: < 3.5s
4. **Total Bundle Size**: < 200KB (compressed)
5. **Server Response Time**: < 200ms

## Implementation Priority

1. **High Impact, Low Effort**:
   - Prefetching strategy optimization
   - Image optimization
   - Resource hints

2. **High Impact, Medium Effort**:
   - Route-based code splitting
   - Lazy loading components
   - PM2 configuration

3. **High Impact, Higher Effort**:
   - Service worker implementation
   - GraphQL query optimization
   - Server-side caching

## Conclusion

By implementing these optimizations, the Damned Designs Qwik storefront will achieve significantly improved performance metrics, resulting in better user experience, higher conversion rates, and improved SEO rankings. The focus on Qwik's unique resumability model and progressive enhancement ensures the site will perform well across all devices and network conditions.
