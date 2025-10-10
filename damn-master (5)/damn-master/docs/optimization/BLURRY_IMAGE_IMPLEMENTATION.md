# Blurry Image Lazy Loading Implementation Guide

This document provides comprehensive instructions for implementing proper blurry image lazy loading with your Qwik + Vendure application, following the best practices from the Biegler's Vendure plugin.

## Overview

Your current `OptimizedImage` component has been enhanced to support:

1. **Server-generated blur hashes** (ThumbHash/BlurHash) - Optimal performance
2. **Client-side blur generation** - Fallback for non-Vendure assets
3. **Smart caching** and loading states
4. **Responsive images** with modern formats (AVIF, WebP)

## Backend Setup (Vendure)

### 1. Install the Blurry Image Plugin

```bash
npm install @danielbiegler/vendure-plugin-blurry-image-lazy-loading
```

### 2. Configure the Plugin

Add to your `vendure-config.ts`:

```typescript
import { PreviewImageHashPlugin, ThumbHashStrategy } from '@danielbiegler/vendure-plugin-blurry-image-lazy-loading';

export const config: VendureConfig = {
  // ...
  plugins: [
    PreviewImageHashPlugin.init({
      hashingStrategy: new ThumbHashStrategy(), // Recommended over BlurHash
      enqueueHashingAfterAssetCreation: true,   // Auto-hash new uploads
    }),
    // ... other plugins
  ],
};
```

### 3. Generate Database Migration

```bash
npx vendure migrate
```

### 4. Generate Hashes for Existing Assets

Run this GraphQL mutation in your Vendure admin:

```graphql
mutation {
  pluginPreviewImageHashCreateImageHashesForAllAssets(
    input: { regenerateExistingHashes: false }
  ) {
    code
    jobsAddedToQueue
    message
  }
}
```

## Frontend Setup (Qwik)

### 1. Install Required Packages

```bash
# For ThumbHash support (recommended)
npm install thumbhash

# OR for BlurHash support
npm install blurhash
```

### 2. Complete the Blur Hash Utilities

Update `/src/utils/blur-hash.ts`:

```typescript
// Uncomment and implement after installing packages

// For ThumbHash:
import { thumbHashToDataURL } from 'thumbhash';

export const decodeThumbHash = (hash: string): string | null => {
  try {
    const binaryString = atob(hash);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return thumbHashToDataURL(bytes);
  } catch (error) {
    console.error('Failed to decode ThumbHash:', error);
    return null;
  }
};

// For BlurHash:
import { decode } from 'blurhash';

export const decodeBlurHash = (hash: string, width: number = 40, height: number = 30): string | null => {
  try {
    const blurHashString = atob(hash);
    const pixels = decode(blurHashString, width, height);
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL();
  } catch (error) {
    console.error('Failed to decode BlurHash:', error);
    return null;
  }
};
```

### 3. Update GraphQL Queries

Add `customFields` to your asset fragments:

```graphql
fragment AssetInfo on Asset {
  id
  preview
  width
  height
  customFields {
    previewImageHash
  }
}
```

## Usage Examples

### Basic Usage with Server Hash

```tsx
<OptimizedImage
  src={asset.preview}
  alt={product.name}
  previewImageHash={asset.customFields?.previewImageHash}
  hashType="thumbhash"
  responsive="productCard"
  placeholder="blur"
  width={400}
  height={300}
/>
```

### Product Detail Page

```tsx
<OptimizedImage
  src={featuredAsset.preview}
  alt={product.name}
  previewImageHash={featuredAsset.customFields?.previewImageHash}
  hashType="thumbhash"
  responsive="productMain"
  placeholder="blur"
  priority
  loading="eager"
  width={800}
  height={600}
/>
```

### Hero Images

```tsx
<OptimizedImage
  src={heroImage.preview}
  alt="Hero"
  previewImageHash={heroImage.customFields?.previewImageHash}
  hashType="thumbhash"
  responsive="hero"
  placeholder="blur"
  priority
  loading="eager"
/>
```

### Fallback for Non-Vendure Images

```tsx
<OptimizedImage
  src="https://external-site.com/image.jpg"
  alt="External image"
  placeholder="blur" // Will use client-side blur generation
  responsive="none"
/>
```

## Performance Benefits

### ThumbHash vs BlurHash vs Client-side

| Method | Size | Quality | Speed | Transparency | Aspect Ratio |
|--------|------|---------|-------|--------------|--------------|
| **ThumbHash** | ~25 bytes | Excellent | Fast | ✅ | ✅ |
| **BlurHash** | ~30-50 bytes | Good | Fast | ❌ | ❌ |
| **Client-side** | N/A | Poor | Slow | ❌ | ❌ |

### Benefits of Server-generated Hashes

1. **Tiny size**: 25-50 bytes vs several KB for tiny images
2. **No extra requests**: Embedded in GraphQL responses
3. **Better quality**: Proper blur algorithms vs CSS blur
4. **Consistent experience**: Same placeholder every time
5. **SEO friendly**: No layout shift during loading

## Migration Guide

### Phase 1: Install Backend Plugin
- Add plugin to Vendure
- Generate migration
- Hash existing assets

### Phase 2: Update Frontend
- Install blur hash packages
- Update GraphQL queries to include customFields
- Test with server hashes

### Phase 3: Gradual Rollout
- New uploads automatically get hashes
- Existing images fall back to client-side blur
- Monitor performance improvements

## Troubleshooting

### Hash Not Available
- Ensure plugin is installed and configured
- Check that migration was run
- Verify GraphQL queries include customFields
- Component falls back to client-side blur

### Performance Issues
- Use ThumbHash over BlurHash for better compression
- Ensure responsive configs are appropriate
- Monitor bundle size impact of blur packages

### Browser Compatibility
- ThumbHash/BlurHash work in all modern browsers
- Fallback to client-side blur for edge cases
- Component gracefully degrades without JavaScript

## Best Practices

1. **Use ThumbHash**: Better quality and compression than BlurHash
2. **Prioritize critical images**: Set `priority={true}` for above-the-fold content  
3. **Choose appropriate responsive configs**: Don't over-optimize
4. **Monitor bundle size**: Only include blur packages you actually use
5. **Test fallbacks**: Ensure component works without server hashes

This implementation provides the same functionality as Biegler's plugin with better integration into your Qwik application.
