# Dynamic Sitemap Implementation Guide

## Overview

This document covers the complete implementation of dynamic sitemaps for the Rotten Hand storefront, including the solution to prevent static XML files from overriding dynamic route handlers.

## Problem Statement

### Issue
Static XML files were being generated during the build process and overriding dynamic route handlers, causing empty or incorrect sitemaps to be served instead of dynamic content from the backend SEO service.

### Root Cause
Build tools (Qwik/Vite) were generating static files for sitemap routes despite exclude configurations, creating interference with server-side route handlers that proxy sitemap content from the backend.

## Solution Architecture

### Dynamic Sitemap Structure
```
/sitemap.xml                 → Main sitemap index (proxies to backend)
/sitemap-main.xml           → Static pages sitemap (proxies to backend)  
/sitemap-products.xml       → Product pages sitemap (proxies to backend)
/sitemap-collections.xml    → Collection pages sitemap (proxies to backend)
```

### Backend Integration
All sitemap routes act as proxies to the backend SEO service running on `http://localhost:3000/seo/`, providing:
- Real-time product and collection data
- Proper SEO metadata
- Centralized sitemap management
- Fallback content when backend is unavailable

## Implementation Details

### 1. Post-Build Cleanup Script

**File**: [`frontend/scripts/cleanup-static-sitemaps.js`](../../frontend/scripts/cleanup-static-sitemaps.js)

```javascript
#!/usr/bin/env node

/**
 * Post-build cleanup script to remove static sitemap files
 * These should be handled by dynamic routes, not static generation
 */

import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

const distDir = 'dist';
const sitemapFiles = [
  'sitemap.xml',
  'sitemap-main.xml', 
  'sitemap-products.xml',
  'sitemap-collections.xml'
];

console.log('🧹 Cleaning up static sitemap files...');

let cleanedFiles = 0;

for (const file of sitemapFiles) {
  const filePath = join(distDir, file);
  if (existsSync(filePath)) {
    try {
      unlinkSync(filePath);
      console.log(`   ✅ Removed static ${file}`);
      cleanedFiles++;
    } catch (error) {
      console.warn(`   ⚠️  Could not remove ${file}:`, error.message);
    }
  }
}

if (cleanedFiles === 0) {
  console.log('   ✨ No static sitemap files found - all clean!');
} else {
  console.log(`🎉 Cleaned up ${cleanedFiles} static sitemap file(s)`);
  console.log('   Dynamic sitemap routes will now work correctly');
}
```

**Purpose**: Automatically removes any static sitemap files generated during the build process, ensuring dynamic routes take precedence.

### 2. Build Script Integration

**File**: [`frontend/package.json`](../../frontend/package.json)

```json
{
  "scripts": {
    "build": "QWIK_LOG_LEVEL=silent qwik build && node scripts/cleanup-static-sitemaps.js",
    "build.verbose": "qwik build && node scripts/cleanup-static-sitemaps.js",
    "cleanup-sitemaps": "node scripts/cleanup-static-sitemaps.js"
  }
}
```

**Integration**: The cleanup script runs automatically after every build, ensuring production deployments never serve static sitemap files.

### 3. Vite Configuration

**File**: [`frontend/vite.config.ts`](../../frontend/vite.config.ts)

```typescript
export default defineConfig((config) => {
  return {
    plugins: [
      qwikRouter({
        // Exclude dynamic sitemap routes from static generation
        exclude: ['/sitemap.xml', '/sitemap-*.xml'],
      }),
      // ... other plugins
    ],
    // ... other config
  };
});
```

**Purpose**: Instructs the Qwik router to exclude sitemap routes from static generation, though the cleanup script provides additional assurance.

### 4. Dynamic Route Handlers

All sitemap routes follow the same pattern of proxying to the backend with fallback content:

#### Main Sitemap Index
**File**: [`frontend/src/routes/sitemap.xml/index.ts`](../../frontend/src/routes/sitemap.xml/index.ts)

```typescript
export const onGet: RequestHandler = async ({ send, headers }) => {
  try {
    const response = await fetch('http://localhost:3000/seo/sitemap.xml', {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
    }

    const xmlData = await response.text();

    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    send(200, xmlData);

  } catch (error) {
    // Fallback sitemap index
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://rottenhand.com/sitemap-main.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
  <!-- Additional sitemaps... -->
</sitemapindex>`;

    headers.set('Content-Type', 'application/xml');
    headers.set('Cache-Control', 'public, max-age=300');
    send(200, fallbackSitemap);
  }
};
```

#### Individual Sitemaps
- **[`sitemap-main.xml`](../../frontend/src/routes/sitemap-main.xml/index.ts)**: Static pages (home, contact, privacy, etc.)
- **[`sitemap-products.xml`](../../frontend/src/routes/sitemap-products.xml/index.ts)**: Dynamic product pages
- **[`sitemap-collections.xml`](../../frontend/src/routes/sitemap-collections.xml/index.ts)**: Dynamic collection pages

Each route includes error handling and fallback content appropriate to its purpose.

## Benefits

### 1. Framework Agnostic
- Works with any build system or framework
- Non-invasive solution that doesn't modify core build tools
- Portable across different projects

### 2. Reliable Operation
- Runs automatically after every build
- Handles missing files gracefully
- Provides clear console output for monitoring

### 3. SEO Advantages
- Real-time sitemap updates reflecting current inventory
- Proper XML formatting and metadata
- Centralized SEO management through backend service
- Fallback content prevents broken sitemaps

### 4. Performance Optimized
- Appropriate caching headers for each sitemap type
- Efficient proxy implementation
- Minimal overhead on build process

## Maintenance

### Monitoring
The cleanup script provides clear output showing which files were removed:

```bash
🧹 Cleaning up static sitemap files...
   ✅ Removed static sitemap.xml
   ✅ Removed static sitemap-main.xml
🎉 Cleaned up 2 static sitemap file(s)
   Dynamic sitemap routes will now work correctly
```

### Adding New Sitemaps
To add additional sitemap routes:

1. **Create the route handler** in `src/routes/sitemap-[name].xml/index.ts`
2. **Add the filename** to the cleanup script's `sitemapFiles` array
3. **Update the exclude pattern** in `vite.config.ts` if needed
4. **Add the sitemap** to the main sitemap index fallback content

### Testing
```bash
# Test cleanup script directly
npm run cleanup-sitemaps

# Test full build process
npm run build

# Verify dynamic routes work
curl http://localhost:3000/sitemap.xml
```

## Troubleshooting

### Common Issues

#### Static Files Still Being Served
**Symptoms**: Empty or outdated sitemap content
**Solution**: 
1. Check if cleanup script is running in build output
2. Verify exclude configuration in `vite.config.ts`
3. Manually run cleanup script: `npm run cleanup-sitemaps`

#### Backend Connection Failures
**Symptoms**: Fallback content being served consistently
**Solution**:
1. Verify backend SEO service is running
2. Check network connectivity to `http://localhost:3000/seo/`
3. Review fallback content to ensure it's appropriate

#### Build Process Failures
**Symptoms**: Cleanup script not executing
**Solution**:
1. Ensure script has executable permissions: `chmod +x scripts/cleanup-static-sitemaps.js`
2. Verify Node.js version supports ES modules
3. Check script syntax and import statements

### Debugging Commands

```bash
# Check if static files exist
ls frontend/dist/sitemap*

# Test script execution
cd frontend && node scripts/cleanup-static-sitemaps.js

# Verify route handlers
curl -H "Accept: application/xml" http://localhost:3000/sitemap.xml

# Monitor build process
npm run build.verbose
```

## Technical Notes

### Why This Solution Works
1. **Post-build execution**: Runs after all static generation is complete
2. **File system approach**: Direct file removal is more reliable than build configuration
3. **Fail-safe design**: Graceful handling of edge cases and errors
4. **Observable behavior**: Clear logging makes issues easy to identify

### Alternative Approaches Considered
- **Build tool configuration only**: Often ignored or overridden by generators
- **Nginx/server-level redirects**: Adds infrastructure complexity
- **Framework-specific solutions**: Not portable across projects
- **Pre-build cleanup**: Static files get regenerated during build

### Performance Impact
- **Build time**: Adds ~50ms to build process
- **Runtime**: No impact on application performance
- **File size**: Minimal script footprint
- **Memory usage**: Negligible during cleanup execution

## Future Considerations

### Potential Enhancements
1. **Configuration file**: Allow sitemap list to be configured externally
2. **Pattern matching**: Support regex patterns for sitemap files
3. **Conditional cleanup**: Only run when static files are detected
4. **Integration with CI/CD**: Enhanced logging for deployment pipelines

### Monitoring Recommendations
1. **Build logs**: Monitor cleanup script output in CI/CD
2. **SEO tools**: Regular sitemap validation with Google Search Console
3. **Performance metrics**: Track sitemap response times and cache hit rates
4. **Error tracking**: Monitor fallback content usage patterns

---

## Related Documentation
- [Backend SEO Plugin](../../backend/src/plugins/seo/README.md)
- [Frontend Routing Guide](./routing.md)
- [Production Deployment](./deployment.md)

## Last Updated
**Date**: 2025-08-16
**Version**: 1.0.0
**Author**: Development Team