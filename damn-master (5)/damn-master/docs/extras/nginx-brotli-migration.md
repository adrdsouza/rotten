# NGINX BROTLI MIGRATION GUIDE

## Step 1: Backup Current Configuration

```bash
# Create backup directory
mkdir -p /home/vendure/nginx-backup/$(date +%Y%m%d-%H%M%S)
cd /home/vendure/nginx-backup/$(date +%Y%m%d-%H%M%S)

# Backup current NPM data
docker cp nginx-proxy-manager:/data ./npm-data-backup
docker cp nginx-proxy-manager:/etc/nginx ./nginx-config-backup

# Export current container settings
docker inspect nginx-proxy-manager > container-config.json
```

## Step 2: Create Brotli-Enabled Docker Compose

Create `/home/vendure/nginx-brotli/docker-compose.yml`:

```yaml
version: '3.8'
services:
  nginx-proxy-manager-brotli:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx-proxy-manager-brotli
    restart: unless-stopped
    ports:
      - '8080:80'    # Temporary port for testing
      - '8081:81'    # Temporary admin port
      - '8443:443'   # Temporary HTTPS port
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
      - ./brotli-config:/etc/nginx/conf.d/brotli.conf:ro
    environment:
      DB_SQLITE_FILE: "/data/database.sqlite"
```

## Step 3: Create Brotli Configuration

Create `/home/vendure/nginx-brotli/brotli-config/brotli.conf`:

```nginx
# Brotli Compression Configuration
load_module modules/ngx_http_brotli_filter_module.so;
load_module modules/ngx_http_brotli_static_module.so;

# Enable Brotli compression
brotli on;
brotli_comp_level 6;
brotli_min_length 1000;
brotli_types
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

# Enable serving pre-compressed Brotli files
brotli_static on;

# Fallback to gzip for unsupported clients
gzip on;
gzip_vary on;
gzip_min_length 1000;
gzip_proxied any;
gzip_comp_level 6;
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

# Serve pre-compressed gzip files
gzip_static on;
```

## Step 4: Migration Commands

```bash
# 1. Stop current container (ONLY when ready to switch)
docker stop nginx-proxy-manager

# 2. Start new Brotli container on different ports
cd /home/vendure/nginx-brotli
docker-compose up -d

# 3. Copy data from backup to new container
docker cp /home/vendure/nginx-backup/latest/npm-data-backup/. nginx-proxy-manager-brotli:/data/

# 4. Test new container at http://yourserver:8081 (admin)

# 5. Switch ports (when ready)
docker-compose down
# Edit docker-compose.yml to use ports 80, 81, 443
docker-compose up -d

# 6. Remove old container (when confirmed working)
docker rm nginx-proxy-manager
```

## Step 5: Verification

```bash
# Test Brotli compression
curl -H "Accept-Encoding: br" -I https://damneddesigns.com/

# Test gzip fallback
curl -H "Accept-Encoding: gzip" -I https://damneddesigns.com/

# Check pre-compressed files are served
curl -H "Accept-Encoding: br" -I https://damneddesigns.com/build/some-file.js
```
