# Vendure + Qwik SEO Implementation Guide

## Complete Technical Documentation for JSON-LD Schema Integration

This guide provides a step-by-step implementation of comprehensive SEO features for a Vendure 3.3.5 backend with Qwik 2.0.0-beta.2 frontend, including JSON-LD schema markup, sitemap generation, and robots.txt management.

---

## 1. Project Context & Prerequisites

### Technology Stack
- **Backend**: Vendure 3.3.5 (Node.js/TypeScript)
- **Frontend**: Qwik 2.0.0-beta.2 (TypeScript)
- **Package Manager**: pnpm
- **Database**: PostgreSQL (compatible with other Vendure-supported databases)
- **Process Manager**: PM2 (for production deployment)

### Required Dependencies

#### Backend Dependencies
```json
{
  "@nestjs/schedule": "^4.0.0",  // Required for cron jobs in fulfillment plugin
  "@vendure/core": "^3.3.5",
  "@vendure/admin-ui-plugin": "^3.3.5"
}
```

#### Frontend Dependencies
```json
{
  "@qwik.dev/core": "2.0.0-beta.2",
  "@qwik.dev/router": "2.0.0-beta.2"
}
```

### Project Structure Assumptions
```
project-root/
├── backend/
│   ├── src/
│   │   └── plugins/
│   │       └── seo-plugin/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   └── package.json
└── docs/
    └── SEO/
```

---

## 2. Backend Implementation Details

### 2.1 SEO Plugin Structure

The SEO plugin provides comprehensive schema generation and sitemap functionality.

#### File: `backend/src/plugins/seo-plugin/seo.plugin.ts`

```typescript
import { PluginCommonModule, VendurePlugin } from '@vendure/core';
import { SeoService } from './seo.service';
import { SeoController } from './seo.controller';

@VendurePlugin({
  imports: [PluginCommonModule],
  controllers: [SeoController],
  providers: [SeoService],
  compatibility: '^3.0.0',
})
export class SeoPlugin {}
```

### 2.2 SEO Service Implementation

#### File: `backend/src/plugins/seo-plugin/seo.service.ts`

The service handles all schema generation logic and data fetching.

**Key Methods:**
- `generateOrganizationJsonLd()`: Creates Organization schema
- `generateWebsiteJsonLd()`: Creates Website schema with search functionality
- `generateProductJsonLd(product)`: Creates Product schema with offers
- `getProductSeoData(ctx)`: Fetches product data for schema generation
- `generateSitemap()`: Creates XML sitemap
- `generateRobotsTxt()`: Creates robots.txt content

**Critical Implementation Details:**
- Uses Vendure's `ProductService` and `CollectionService` for data fetching
- Implements proper error handling and fallbacks
- Includes caching considerations for performance
- Handles product availability states correctly

### 2.3 SEO Controller Implementation

#### File: `backend/src/plugins/seo-plugin/seo.controller.ts`

**API Endpoints:**

```typescript
// Organization Schema
GET /seo/schema/organization
Response: JSON-LD Organization schema
Cache: 1 hour (3600s)

// Website Schema  
GET /seo/schema/website
Response: JSON-LD Website schema with SearchAction
Cache: 1 hour (3600s)

// Product Schema
GET /seo/schema/product/:productId
Response: JSON-LD Product schema with Offer
Cache: 5 minutes (300s)

// Sitemap
GET /seo/sitemap.xml
Response: XML sitemap
Cache: 1 hour (3600s)

// Robots.txt
GET /seo/robots.txt
Response: Plain text robots.txt
Cache: 24 hours (86400s)
```

**Important Implementation Note:**
The `getProductSeoData()` method in the service must be made **public** (not private) to be accessible from the controller.

### 2.4 Database Considerations

No additional database schema changes are required. The SEO plugin uses existing Vendure entities:
- `Product` - for product schema generation
- `Collection` - for category/collection schemas
- `ProductVariant` - for pricing and availability data
- `Asset` - for product images

---

## 3. Frontend Implementation Details

### 3.1 TypeScript Type Definitions

#### File: `frontend/src/types/seo.types.ts`

Comprehensive type definitions for all schema formats and API responses:

```typescript
export interface JsonLdSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface ProductSchema extends JsonLdSchema {
  '@type': 'Product';
  name: string;
  description: string;
  sku: string;
  brand: {
    '@type': 'Brand';
    name: string;
  };
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
    availability: string;
    seller: {
      '@type': 'Organization';
      name: string;
    };
  };
  image?: string;
}

// Additional schema interfaces...
```

### 3.2 SEO API Service Implementation

#### File: `frontend/src/services/seo-api.service.ts`

**Key Features:**
- Server-side functions using Qwik's `server$()` 
- In-memory LRU cache with configurable TTL
- Comprehensive error handling with fallbacks
- TypeScript-first API design

**Cache Configuration:**
```typescript
const CACHE_CONFIG: SeoApiCacheConfig = {
  ttl: 300, // 5 minutes
  maxSize: 100,
  enabled: true
};
```

**Critical Implementation Details:**
- Uses `server$()` for server-side execution
- Implements proper cache eviction (LRU)
- Handles network failures gracefully
- Returns structured response objects with success/error states

### 3.3 Schema Injection Utilities

#### File: `frontend/src/utils/schema-injection.ts`

**Core Functions:**
- `validateJsonLdSchema()`: Ensures schema validity
- `createJsonLdMeta()`: Creates meta tags for JSON-LD
- `injectJsonLdSchemas()`: Processes multiple schemas
- `sanitizeSchema()`: Security-focused schema cleaning

**Qwik 2.0 Compatibility Approach:**
Due to Qwik's DocumentHead limitations, we use a dual approach:
1. **Meta tags**: Store JSON-LD data in meta tags with `name="json-ld-*"`
2. **Script tags**: Head component converts meta tags to proper `<script type="application/ld+json">` tags

### 3.4 Enhanced SEO Utils

#### File: `frontend/src/utils/seo.ts`

**Backward Compatibility:**
The existing `createSEOHead()` function is enhanced with an optional `schemas` parameter:

```typescript
interface SEOConfig {
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  canonical?: string;
  links?: Array<LinkTag>;
  schemas?: JsonLdSchema[]; // NEW: Optional JSON-LD schemas
}
```

**Implementation Strategy:**
- All existing calls continue working unchanged
- New `schemas` parameter is optional
- Automatic JSON-LD meta tag generation
- Debug logging in development mode

### 3.5 Head Component Modifications

#### File: `frontend/src/components/head/head.tsx`

**JSON-LD Script Injection:**
```typescript
{/* JSON-LD Schema injection */}
{(head as any).meta?.filter((m: any) => m.name?.startsWith('json-ld-')).map((jsonLdMeta: any, index: number) => (
  <script 
    key={`jsonld-${index}`}
    type="application/ld+json"
    dangerouslySetInnerHTML={jsonLdMeta.content || '{}'}
  />
))}
```

**Why This Approach:**
- Qwik's DocumentHead interface doesn't directly support script tags
- Meta tags can be processed through the standard head system
- Head component converts meta tags to proper JSON-LD scripts
- Maintains SSR compatibility

---

## 4. Route-Level Integration

### 4.1 Homepage Implementation

#### File: `frontend/src/routes/index.tsx`

**Key Constraint:** Qwik head functions must be **synchronous**

```typescript
export const head = () => {
  // Note: Qwik head functions must be synchronous
  // For now, we'll add schemas without backend data
  // TODO: Implement schema loading via route loader or client-side
  
  return createSEOHead({
    title: 'Damned Designs - Precision Crafted Knives',
    description: 'Premium handcrafted knives and tools...',
    noindex: false,
    links: [/* preload links */]
  });
};
```

**Future Enhancement:** Use Qwik route loaders for async schema fetching.

### 4.2 Product Page Implementation

#### File: `frontend/src/routes/products/[...slug]/index.tsx`

**Breadcrumb Schema Integration:**
```typescript
export const head = ({ resolveValue, url }: { resolveValue: any, url: URL }) => {
  const product = resolveValue(useProductLoader);
  
  // Generate breadcrumb schema (synchronous)
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://damneddesigns.com/' },
    { name: 'Shop', url: 'https://damneddesigns.com/shop' },
    { name: product?.name || 'Product', url: url.href }
  ]);
  
  return createSEOHead({
    title: product?.name || 'Product',
    description: cleanDescription || `${product?.name} - Premium quality knife...`,
    image: product?.featuredAsset?.preview,
    canonical: url.href,
    links: imagePreloadLinks,
    schemas: [breadcrumbSchema], // Add breadcrumb schema
  });
};
```

### 4.3 Shop/Category Page Implementation

#### File: `frontend/src/routes/shop/index.tsx`

**Dynamic Breadcrumb Generation:**
```typescript
export const head = ({ url }: { url: URL }) => {
  const searchTerm = url.searchParams.get('q') || '';

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: 'https://damneddesigns.com/' },
    { name: searchTerm ? `Search: ${searchTerm}` : 'Shop', url: url.href }
  ]);

  return createSEOHead({
    title: searchTerm ? `Search results for "${searchTerm}"` : 'Shop All Premium Knives & Tools',
    description: searchTerm ? `Find products matching "${searchTerm}"...` : 'Browse our complete collection...',
    canonical: url.href,
    schemas: [breadcrumbSchema],
  });
};
```

---

## 5. Proxy Routes & Sitemap Implementation

### 5.1 Main Sitemap Proxy

#### File: `frontend/src/routes/sitemap.xml/index.ts`

```typescript
import type { RequestHandler } from '@qwik.dev/router';
import { fetchSitemap } from '~/services/seo-api.service';

export const onGet: RequestHandler = async ({ send, headers }) => {
  try {
    const sitemap = await fetchSitemap('main');
    
    if (!sitemap) {
      // Fallback sitemap if backend unavailable
      const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://damneddesigns.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;
      
      headers.set('Content-Type', 'application/xml');
      headers.set('Cache-Control', 'public, max-age=3600');
      send(200, fallbackSitemap);
      return;
    }
    
    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=3600');
    send(200, sitemap);
    
  } catch (error) {
    console.error('Error serving sitemap:', error);
    // Return minimal sitemap on error
    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=300');
    send(500, errorSitemap);
  }
};
```

### 5.2 Robots.txt Proxy

#### File: `frontend/src/routes/robots.txt/index.ts`

**Fallback Strategy:**
```typescript
const fallbackRobots = `# Robots.txt for Damned Designs
User-agent: *
Allow: /

# Disallow sensitive areas
Disallow: /admin/
Disallow: /checkout/
Disallow: /account/

# Sitemap location
Sitemap: https://damneddesigns.com/sitemap.xml`;
```

### 5.3 Additional Sitemap Routes

Create similar proxy routes for:
- `frontend/src/routes/sitemap-products.xml/index.ts`
- `frontend/src/routes/sitemap-collections.xml/index.ts`

**Cache Strategy:**
- Main sitemap: 1 hour cache
- Product sitemap: 30 minutes cache (products change more frequently)
- Collections sitemap: 1 hour cache

---

## 6. Testing & Validation

### 6.1 Backend API Testing

**Test Organization Schema:**
```bash
curl -s "http://localhost:3000/seo/schema/organization" | jq .
```

**Expected Response:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Damned Designs",
  "url": "https://damneddesigns.com",
  "logo": "https://damneddesigns.com/logo.png"
}
```

**Test Product Schema:**
```bash
curl -s "http://localhost:3000/seo/schema/product/PRODUCT_ID" | jq .
```

### 6.2 Frontend Schema Validation

**Check JSON-LD in HTML:**
```bash
curl -s "http://localhost:4000/shop/" | grep -i "json-ld"
```

**Expected Output:**
- Meta tag: `<meta content="{...}" name="json-ld-breadcrumblist-0">`
- Script tag: `<script type="application/ld+json">{...}</script>`

### 6.3 Schema Testing Tools

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **JSON-LD Playground**: https://json-ld.org/playground/

### 6.4 Common Troubleshooting

**Issue: Schemas not appearing in HTML**
- Check if head function is synchronous (Qwik requirement)
- Verify meta tags are being generated
- Ensure head component is processing meta tags correctly

**Issue: Invalid JSON-LD**
- Use schema validation functions
- Check for proper escaping in script tags
- Verify @context and @type are present

**Issue: Backend API errors**
- Check if `getProductSeoData()` method is public
- Verify all required dependencies are installed
- Check database connectivity and data availability

---

## 7. Technical Considerations

### 7.1 Qwik-Specific Constraints

**Synchronous Head Functions:**
Qwik requires head export functions to be synchronous. This means:
- No `await` in head functions
- No async schema fetching in head functions
- Must use synchronous data or route loaders

**DocumentHead Limitations:**
Qwik's DocumentHead interface doesn't directly support script tags, requiring the meta tag + head component conversion approach.

### 7.2 Performance Optimizations

**Caching Strategy:**
- Backend: HTTP cache headers (1 hour for static schemas, 5 minutes for dynamic)
- Frontend: In-memory LRU cache with TTL
- CDN: Leverage cache headers for edge caching

**Bundle Size Considerations:**
- Schema generation is server-side only
- Frontend utilities are minimal and tree-shakeable
- No additional runtime dependencies

### 7.3 Security Considerations

**JSON-LD Injection Safety:**
- All schema content is escaped for HTML context
- Input validation on all schema data
- Sanitization of user-generated content in schemas

**API Security:**
- No sensitive data exposed in schemas
- Proper error handling without information leakage
- Rate limiting considerations for public endpoints

---

## 8. File Structure & Organization

### 8.1 Complete File Structure

```
backend/
├── src/
│   └── plugins/
│       └── seo-plugin/
│           ├── seo.plugin.ts
│           ├── seo.service.ts
│           └── seo.controller.ts

frontend/
├── src/
│   ├── components/
│   │   └── head/
│   │       └── head.tsx (modified)
│   ├── routes/
│   │   ├── index.tsx (modified)
│   │   ├── shop/
│   │   │   └── index.tsx (modified)
│   │   ├── products/
│   │   │   └── [...slug]/
│   │   │       └── index.tsx (modified)
│   │   ├── sitemap.xml/
│   │   │   └── index.ts (new)
│   │   ├── sitemap-products.xml/
│   │   │   └── index.ts (new)
│   │   ├── sitemap-collections.xml/
│   │   │   └── index.ts (new)
│   │   └── robots.txt/
│   │       └── index.ts (new)
│   ├── services/
│   │   └── seo-api.service.ts (new)
│   ├── types/
│   │   └── seo.types.ts (new)
│   └── utils/
│       ├── seo.ts (modified)
│       └── schema-injection.ts (new)

docs/
└── SEO/
    └── vendure-qwik-seo-implementation-guide.md (this file)
```

### 8.2 Code Organization Patterns

**Separation of Concerns:**
- **Types**: Centralized in `types/seo.types.ts`
- **API Logic**: Isolated in `services/seo-api.service.ts`
- **Utilities**: Modular functions in `utils/`
- **Route Integration**: Minimal, focused implementations

**Naming Conventions:**
- Schema interfaces: `*Schema` (e.g., `ProductSchema`)
- API functions: `fetch*` or `generate*` prefix
- Utility functions: Descriptive action names
- File names: kebab-case with clear purpose

---

## 9. Deployment Considerations

### 9.1 Build Process

**Backend:**
```bash
cd backend
pnpm build
pm2 restart admin
```

**Frontend:**
```bash
cd frontend  
pnpm build
pm2 restart store
```

### 9.2 Environment Variables

No additional environment variables required. The implementation uses existing Vendure configuration.

### 9.3 Production Checklist

- [ ] Backend SEO plugin registered in main config
- [ ] All API endpoints responding correctly
- [ ] Frontend builds without TypeScript errors
- [ ] JSON-LD schemas visible in production HTML
- [ ] Sitemap and robots.txt accessible
- [ ] Cache headers properly set
- [ ] Schema validation passing

---

## 10. Future Enhancements

### 10.1 Potential Improvements

1. **Route Loaders**: Implement Qwik route loaders for async schema fetching
2. **Product Schema**: Add full product JSON-LD to product pages
3. **Review Schema**: Integrate customer reviews into product schemas
4. **Local Business**: Add LocalBusiness schema for physical locations
5. **FAQ Schema**: Add FAQ markup for common questions
6. **Video Schema**: Support for product videos
7. **Event Schema**: For product launches or sales events

### 10.2 Monitoring & Analytics

1. **Rich Results Monitoring**: Track Google Search Console for rich results
2. **Performance Impact**: Monitor Core Web Vitals impact
3. **Schema Errors**: Set up alerts for schema validation failures
4. **API Performance**: Monitor backend schema generation performance

---

## Conclusion

This implementation provides a comprehensive, production-ready SEO solution for Vendure + Qwik projects. The approach balances technical constraints (Qwik's synchronous head functions) with SEO best practices (proper JSON-LD schema markup) while maintaining backward compatibility and performance optimization.

The dual meta tag + script tag approach ensures maximum compatibility with search engines while working within Qwik's architectural constraints. The comprehensive caching strategy and error handling make the solution robust for production use.

For questions or issues with this implementation, refer to the troubleshooting section or consult the Vendure and Qwik documentation for framework-specific details.
