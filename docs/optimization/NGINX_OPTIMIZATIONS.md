# NGINX OPTIMIZATIONS FOR DAMNEDDESIGNS.COM
# Apply these changes to your Nginx Proxy Manager configuration

## 1. MAIN ISSUES FOUND:
- Cache headers too short (5 seconds -> should be 5 minutes for pages, 1 year for assets)
- No proxy caching enabled
- Missing proxy buffering optimizations
- Assets not being cached by nginx

## 2. QWIK APP CACHE HEADERS (ALREADY FIXED):
✅ Updated layout.tsx: maxAge from 5 seconds to 5 minutes

## 3. NGINX PROXY MANAGER OPTIMIZATIONS TO APPLY:

### A) Add to the main server block in your proxy host config:

```nginx
# Proxy buffering for better performance
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
proxy_temp_file_write_size 256k;

# Timeout settings
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# Proxy cache configuration
proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=my_cache:100m max_size=1g inactive=60m use_temp_path=off;
```

### B) Replace/optimize existing location blocks:

```nginx
# Static assets - aggressive caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif|mp4|webm)$ {
    proxy_pass http://5.78.142.235:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Nginx proxy cache
    proxy_cache my_cache;
    proxy_cache_valid 200 302 1d;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout invalid_header updating http_500 http_502 http_503 http_504;
    
    # Browser cache headers
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Cache-Status $upstream_cache_status always;
    expires 1y;
}

# Images from Vendure backend - cache aggressively
location /assets {
    proxy_pass http://5.78.142.235:3000/assets/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Nginx proxy cache
    proxy_cache my_cache;
    proxy_cache_valid 200 302 7d;  # Cache for 7 days
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout invalid_header updating;
    
    # Browser cache headers
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header Access-Control-Allow-Origin "*" always;
    expires 1y;
}

# API responses - brief caching
location ~* ^/(shop-api|admin-api)/ {
    proxy_pass http://5.78.142.235:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Brief cache for API responses
    proxy_cache my_cache;
    proxy_cache_valid 200 2m;
    proxy_cache_valid 404 1m;
    proxy_cache_bypass $http_authorization;  # Don't cache authenticated requests
    proxy_no_cache $http_authorization;
}
```

## 4. ADDITIONAL OPTIMIZATIONS:

### A) Enable HTTP/2 Server Push (if not already enabled):
```nginx
http2_push_preload on;
```

### B) Optimize gzip further:
```nginx
gzip_min_length 1000;
gzip_proxied expired no-cache no-store private auth;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json
    application/xml
    image/svg+xml
    font/woff
    font/woff2;
```

### C) Add security headers:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 5. EXPECTED IMPROVEMENTS:
- Static assets cached for 1 year (vs unlimited reloads)
- Images cached at nginx level (7 days) + browser level (1 year)
- API responses cached for 2 minutes (reduce backend load)
- Better proxy buffering (faster response times)
- Pages cached for 5 minutes instead of 5 seconds

## 6. HOW TO APPLY:
1. Go to Nginx Proxy Manager admin (port 81)
2. Edit your damneddesigns.com proxy host
3. Go to "Advanced" tab
4. Add the optimizations above to the "Custom Nginx Configuration" section
5. Save and test

This should significantly improve your site's performance, especially for repeat visits and image loading.
