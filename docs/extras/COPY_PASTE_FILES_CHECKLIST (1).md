# SEO Implementation Copy-Paste Checklist

## Files to Copy Exactly (No Modifications Needed)

### Backend Files
Copy these files exactly as-is to your new project:

```
backend/src/plugins/seo-plugin/
├── seo.plugin.ts
├── seo.service.ts
└── seo.controller.ts
```

### Frontend Files - Core SEO System
Copy these files exactly as-is:

```
frontend/src/types/
└── seo.types.ts

frontend/src/services/
└── seo-api.service.ts

frontend/src/utils/
└── schema-injection.ts
```

### Frontend Files - Sitemap Routes
Copy these route files exactly as-is:

```
frontend/src/routes/sitemap.xml/
└── index.ts

frontend/src/routes/sitemap-main.xml/
└── index.ts

frontend/src/routes/sitemap-products.xml/
└── index.ts

frontend/src/routes/sitemap-collections.xml/
└── index.ts

frontend/src/routes/robots.txt/
└── index.ts
```

## Files to Modify (Project-Specific Changes Required)

### Backend Configuration
**File:** `backend/src/vendure-config.ts`
Add the SEO plugin to your plugins array:

```typescript
import { SeoPlugin } from './plugins/seo-plugin/seo.plugin';

export const config: VendureConfig = {
  // ... existing config
  plugins: [
    // ... existing plugins
    SeoPlugin,
  ],
};
```

### Frontend Files - Requires Customization

#### 1. Head Component
**File:** `frontend/src/components/head/head.tsx`
Add the JSON-LD script injection code (see line 258-266 in the guide).

#### 2. SEO Utils Enhancement
**File:** `frontend/src/utils/seo.ts`
Enhance your existing `createSEOHead()` function to support schemas parameter.

#### 3. Route Integrations (Optional)
These files need project-specific customization:
- `frontend/src/routes/index.tsx` - Homepage schema
- `frontend/src/routes/products/[...slug]/index.tsx` - Product page schema
- `frontend/src/routes/shop/index.tsx` - Shop page schema

### Frontend Build Configuration
**File:** `frontend/vite.config.ts`
Add sitemap exclusion from SSG:

```typescript
qwikRouter({
  // Exclude dynamic sitemap routes from static generation
  exclude: ['/sitemap.xml', '/sitemap-*.xml'],
}),
```

## Project-Specific Customizations Required

### 1. Company/Brand Information
Update these values in the copied files:

**In `seo.service.ts`:**
- Company name: "Damned Designs" → Your company name
- Website URL: "https://damneddesigns.com" → Your domain
- Logo URL: Update to your logo
- Contact information
- Social media links

**In sitemap route files:**
- Domain URLs: "https://damneddesigns.com" → Your domain

### 2. Product Categories/Collections
**In `seo.service.ts`:**
Update the collections logic to match your product categories.

### 3. Robots.txt Customization
**In `robots.txt/index.ts`:**
- Update disallowed paths for your site structure
- Update sitemap URL to your domain

## Installation Steps

### 1. Copy Files
```bash
# Copy backend files
cp -r /path/to/damned-designs/backend/src/plugins/seo-plugin /path/to/new-project/backend/src/plugins/

# Copy frontend files
cp /path/to/damned-designs/frontend/src/types/seo.types.ts /path/to/new-project/frontend/src/types/
cp /path/to/damned-designs/frontend/src/services/seo-api.service.ts /path/to/new-project/frontend/src/services/
cp /path/to/damned-designs/frontend/src/utils/schema-injection.ts /path/to/new-project/frontend/src/utils/

# Copy sitemap routes
cp -r /path/to/damned-designs/frontend/src/routes/sitemap* /path/to/new-project/frontend/src/routes/
cp -r /path/to/damned-designs/frontend/src/routes/robots.txt /path/to/new-project/frontend/src/routes/
```

### 2. Install Dependencies
No additional dependencies required - uses existing Vendure and Qwik packages.

### 3. Register Plugin
Add `SeoPlugin` to your Vendure config plugins array.

### 4. Update Build Config
Add sitemap exclusion to your `vite.config.ts`.

### 5. Customize Company Info
Update all company-specific information in the copied files.

### 6. Build and Deploy
```bash
# Backend
cd backend && pnpm build && pm2 restart admin

# Frontend  
cd frontend && pnpm build && pm2 restart store
```

## Testing Checklist

After implementation, test these endpoints:

- [ ] `GET /seo/schema/organization` - Returns organization schema
- [ ] `GET /seo/schema/website` - Returns website schema
- [ ] `GET /seo/schema/product/{id}` - Returns product schema
- [ ] `GET /seo/sitemap.xml` - Returns sitemap index
- [ ] `GET /seo/robots.txt` - Returns robots.txt
- [ ] Frontend sitemap routes work: `/sitemap.xml`, `/sitemap-main.xml`, etc.
- [ ] JSON-LD schemas appear in page HTML source
- [ ] Google Rich Results Test passes
- [ ] Schema.org validator passes

## Quick Start Summary

1. **Copy the exact files listed above**
2. **Register SeoPlugin in Vendure config**
3. **Update vite.config.ts with sitemap exclusion**
4. **Customize company information**
5. **Build and deploy**
6. **Test all endpoints**

The implementation is designed to be largely copy-paste friendly with minimal customization required.
