# Nginx with Brotli Compression - Damned Designs Production Setup

## 📋 Overview

This document details the complete nginx-brotli implementation for damneddesigns.com, providing superior compression and performance compared to the previous nginx-proxy-manager setup.

## 🚀 Current Production Status

- **Status**: ✅ **ACTIVE** (Deployed August 1, 2025)
- **Container**: `nginx-brotli-production`
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Restart Policy**: `unless-stopped` (auto-restart enabled)
- **Backup**: `nginx-proxy-manager` (stopped, no auto-restart)

## 📊 Performance Benefits

### Compression Improvements
- **Brotli**: 15-25% better compression than gzip
- **Dual Compression**: Brotli for modern browsers, gzip fallback
- **Static Pre-compression**: Build-time compression for optimal performance

### Security Enhancements
- **Modern SSL/TLS**: TLS 1.2/1.3 with secure cipher suites
- **HSTS Headers**: Strict Transport Security enabled
- **Security Headers**: XSS protection, content type options, frame options
- **CSP**: Content Security Policy configured

### Performance Optimizations
- **Proxy Buffering**: 128k/256k buffers for better throughput
- **Static Asset Caching**: 1-year cache headers for assets
- **Connection Optimization**: HTTP/2, keep-alive, optimized timeouts

## 🏗️ Architecture

### File Structure
```
nginx-brotli/
├── Dockerfile                          # Docker build configuration
├── docker-compose.yml                  # Docker Compose setup
├── nginx.conf                          # Main nginx configuration
├── damneddesigns.conf                  # Production server config
├── damneddesigns-http-only.conf        # HTTP-only test config
├── test-migration.sh                   # Migration test script
├── README.md                           # Setup documentation
├── ssl/
│   ├── damneddesigns.com/
│   │   ├── fullchain.pem               # SSL certificate
│   │   └── privkey.pem                 # SSL private key
│   └── archive/                        # Certificate backups
└── logs/                               # Nginx access/error logs
    ├── access.log
    ├── error.log
    ├── damneddesigns_access.log
    └── damneddesigns_error.log
```

### Container Configuration
- **Base Image**: `macbre/nginx-brotli:latest`
- **Container Name**: `nginx-brotli-production`
- **Network**: Default Docker bridge
- **Volumes**:
  - SSL certificates: `./ssl:/etc/letsencrypt/live:ro`
  - Logs: `./logs:/var/log/nginx`

## 🔧 Configuration Details

### Brotli Settings
```nginx
brotli on;
brotli_comp_level 4;              # Balanced compression/CPU usage
brotli_min_length 1000;           # Only compress files > 1KB
brotli_static on;                 # Serve pre-compressed files
brotli_types text/plain text/css text/javascript application/javascript 
             application/json application/xml application/xml+rss 
             image/svg+xml font/woff font/woff2;
```

### SSL Configuration
```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:
            ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 1d;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
```

### Proxy Configuration
```nginx
proxy_buffering on;
proxy_buffer_size 128k;
proxy_buffers 4 256k;
proxy_busy_buffers_size 256k;
proxy_temp_file_write_size 256k;
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;
```

## 🛣️ Routing Configuration

### Backend Services (Port 3000)
- `/admin-api` → Vendure Admin API
- `/shop-api` → Vendure Shop API  
- `/payments` → Payment processing
- `/assets` → Static assets (1-year cache)
- `/admin` → Admin interface
- `/health` → Health check endpoint

### Frontend Services (Port 4000)
- `/images` → Frontend images
- `/fonts/` → Font files
- `/` → Main Qwik application
- Static files regex: `^/[^/]+\.(avif|webp|png|jpg|jpeg|gif|css|js|woff|woff2)$`

## 🔍 Verification Commands

### Test Brotli Compression
```bash
curl -H "Accept-Encoding: br" -I https://damneddesigns.com/
# Should return: content-encoding: br
```

### Test HTTPS
```bash
curl -I https://damneddesigns.com/
# Should return: HTTP/2 200
```

### Test Admin Interface
```bash
curl -I https://damneddesigns.com/admin
# Should return: HTTP/2 301 (redirect to /admin/)
```

### Check Container Status
```bash
docker ps --filter name=nginx-brotli-production
```

### View Logs
```bash
# Access logs
docker logs nginx-brotli-production
# Or direct file access
tail -f nginx-brotli/logs/damneddesigns_access.log
```

## 🔄 Management Commands

### Start Production Container
```bash
cd nginx-brotli
docker run -d --name nginx-brotli-production \
  --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v $(pwd)/ssl:/etc/letsencrypt/live:ro \
  -v $(pwd)/logs:/var/log/nginx \
  nginx-brotli-damneddesigns
```

### Stop/Start Container
```bash
docker stop nginx-brotli-production
docker start nginx-brotli-production
```

### Rebuild Image
```bash
cd nginx-brotli
docker build -t nginx-brotli-damneddesigns .
```

### Emergency Rollback
```bash
# Stop nginx-brotli
docker stop nginx-brotli-production

# Start backup nginx-proxy-manager
docker start nginx-proxy-manager
```

## 🔐 Security Features

### Headers Applied
- `Strict-Transport-Security`: HSTS with preload
- `X-Frame-Options`: DENY (clickjacking protection)
- `X-Content-Type-Options`: nosniff
- `X-XSS-Protection`: "1; mode=block"
- `Referrer-Policy`: "strict-origin-when-cross-origin"

### CORS Configuration
- Assets: `Access-Control-Allow-Origin: *`
- Methods: `GET, OPTIONS`
- Headers: `Origin, X-Requested-With, Content-Type, Accept`

## 📈 Monitoring

### Log Files
- **Access Log**: `nginx-brotli/logs/damneddesigns_access.log`
- **Error Log**: `nginx-brotli/logs/damneddesigns_error.log`
- **General Access**: `nginx-brotli/logs/access.log`
- **General Error**: `nginx-brotli/logs/error.log`

### Key Metrics to Monitor
- Response times
- Compression ratios
- SSL handshake performance
- Error rates
- Cache hit rates

## 🚨 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker logs nginx-brotli-production
# Check configuration syntax
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro nginx nginx -t
```

**SSL certificate issues:**
```bash
# Verify certificate files
ls -la ssl/damneddesigns.com/
# Check certificate validity
openssl x509 -in ssl/damneddesigns.com/fullchain.pem -text -noout
```

**Brotli not working:**
```bash
# Test compression
curl -H "Accept-Encoding: br,gzip" -v https://damneddesigns.com/ 2>&1 | grep -i encoding
```

## 📝 Maintenance

### SSL Certificate Renewal
When certificates are renewed by nginx-proxy-manager or Let's Encrypt:
1. Copy new certificates to `ssl/damneddesigns.com/`
2. Restart container: `docker restart nginx-brotli-production`

### Configuration Updates
1. Edit configuration files in `nginx-brotli/`
2. Rebuild image: `docker build -t nginx-brotli-damneddesigns .`
3. Stop old container: `docker stop nginx-brotli-production`
4. Start new container with updated image

### Log Rotation
Logs are automatically rotated by Docker. For manual rotation:
```bash
docker exec nginx-brotli-production nginx -s reopen
```

---

**Last Updated**: August 1, 2025  
**Status**: Production Active  
**Next Review**: September 1, 2025
