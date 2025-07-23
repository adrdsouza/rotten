# Safari Image Loading Fix

## Problem
Images from `https://rottenhand.com/assetspreview/*` work on desktop but not Safari mobile due to CORS headers.

## Root Cause
Your server returns these problematic headers:
```
cross-origin-resource-policy: same-origin
access-control-allow-credentials: true
```

Safari is stricter about CORS than other browsers.

## Server-Side Fixes

### 1. Nginx Configuration (if using nginx)
Add to your nginx config for image assets:

```nginx
location ~* ^/assetspreview/.*\.(png|jpg|jpeg|gif|webp)$ {
    # Allow cross-origin access for images
    add_header Access-Control-Allow-Origin "*" always;
    add_header Cross-Origin-Resource-Policy "cross-origin" always;
    
    # Remove the problematic same-origin policy
    more_clear_headers "Cross-Origin-Resource-Policy";
    add_header Cross-Origin-Resource-Policy "cross-origin";
    
    # Cache headers
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 2. Vendure Backend Configuration
In your Vendure config, update the CORS settings:

```typescript
// vendure-config.ts
export const config: VendureConfig = {
  // ...existing config
  apiOptions: {
    cors: {
      origin: ['https://rottenhand.com', 'http://localhost:4000'],
      credentials: true,
    },
  },
  assetOptions: {
    // Add proper CORS for assets
    assetPreviewStrategy: new SharpAssetPreviewStrategy({
      // ...existing options
      cors: {
        origin: '*', // Allow all origins for public assets
        methods: ['GET'],
      }
    }),
  },
};
```

### 3. Express/Node.js Server Fix (if applicable)
```javascript
// Add specific CORS handling for asset routes
app.use('/assetspreview', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
```

## Client-Side Fixes (Already Applied)

The `OptimizedImage` component now includes:
```typescript
crossOrigin={isCrossOrigin ? 'anonymous' : undefined}
```

This tells Safari to make a proper CORS request for cross-origin images.

## Testing

After applying server fixes, test with:
```bash
curl -I https://rottenhand.com/assetspreview/b6/dscf7119__preview.png?preset=thumb
```

You should see:
```
Access-Control-Allow-Origin: *
Cross-Origin-Resource-Policy: cross-origin
```

## Safari Developer Tools
Enable Safari Developer Tools and check Console for CORS errors:
1. Settings > Advanced > Show Develop menu
2. Develop > Show Web Inspector
3. Check Console tab for image loading errors
