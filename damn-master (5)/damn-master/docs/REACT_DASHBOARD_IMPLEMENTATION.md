# Vendure React Dashboard Implementation Guide

**Project:** Damned Designs
**Vendure Version:** 3.4.3+
**Status:** ✅ Production Implementation Complete with PCI Compliance
**Date:** October 2025
**Document Version:** 2.0

---

## Overview

This guide documents the complete implementation of Vendure's React-based Dashboard (replacing the legacy Angular Admin UI) with full PCI compliance security configuration. This is the **single source of truth** for implementing the Dashboard on any Damned Designs clone or new Vendure project.

### What's Covered

1. **React Dashboard Setup** - Complete Vite configuration and build process
2. **ES Module Compatibility** - Fixes for projects using `"type": "module"`
3. **Docker Networking** - Critical nginx configuration for Docker containers
4. **PCI Compliance** - Firewall rules and XSS protection (Requirement 6.5.7)
5. **Security Hardening** - Multi-layer security implementation
6. **Troubleshooting** - Comprehensive solutions for common issues

### Quick Reference - Key Differences from Standard Setup

**⚠️ CRITICAL CHANGES:**

| Issue | Standard Approach | Damned Designs Approach | Why |
|-------|------------------|------------------------|-----|
| PM2 Script | `script: "npx vite preview"` | Wrapper script `start-dashboard.sh` | PM2 can't resolve pnpm/vite in PATH |
| PM2 Config | `.js` extension | `.cjs` extension | ES module compatibility (`"type": "module"`) |
| Nginx Proxy | `proxy_pass http://127.0.0.1:5173` | `proxy_pass http://SERVER_IP:5173` | Docker container networking isolation |
| Port Security | Ports open to internet | UFW firewall blocks direct access | PCI compliance - prevent XSS bypass |
| Vite Config | Standard `__dirname` | Import fileURLToPath workaround | ES module compatibility |

### Implementation Time

- **Fresh setup**: ~2-3 hours
- **With this guide**: ~45 minutes
- **With firewall configuration**: +15 minutes

---

## Prerequisites

- Vendure 3.4.3 or higher
- Node.js 18+ and pnpm
- Existing Vendure backend running on port 3000
- Nginx configured (Docker or native)
- PM2 for process management

---

## Implementation Steps

### 1. Install Dependencies

Add the Dashboard package and Vite to your backend:

```bash
cd backend
```

**Edit `package.json` manually** - Add these to the appropriate sections:

```json
{
  "dependencies": {
    "@vendure/dashboard": "^3.4.3"
  },
  "devDependencies": {
    "vite": "^6.0.7"
  },
  "scripts": {
    "build": "tsc && cp -r static dist/ && pm2 restart admin worker && vite build && pm2 restart dashboard",
    "build:backend": "tsc && cp -r static dist/",
    "build:dashboard": "vite build",
    "dev:dashboard": "vite"
  }
}
```

Then install:

```bash
pnpm install
```

---

### 2. Create Vite Configuration

Create `backend/vite.config.mts`:

```typescript
import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { pathToFileURL } from 'url';
import { defineConfig } from 'vite';
import { resolve, join } from 'path';

export default defineConfig({
    base: '/admin',
    build: {
        outDir: join(__dirname, 'dist/dashboard'),
    },
    plugins: [
        vendureDashboardPlugin({
            vendureConfigPath: pathToFileURL('./src/vendure-config.ts'),
            api: {
                // Use production domain - browser connects to this
                host: process.env.ADMIN_API_HOST || 'https://damneddesigns.com',
                port: undefined, // No port needed for HTTPS
            },
            gqlOutputPath: './src/gql',
        }),
    ],
    resolve: {
        alias: {
            '@/gql': resolve(__dirname, './src/gql/graphql.ts'),
        },
    },
    server: {
        port: 5173,
        strictPort: false,
        host: true,
    },
    preview: {
        port: 5173,
        strictPort: false,
        host: true,
        allowedHosts: ['damneddesigns.com', 'localhost'],
    },
});
```

**Important:** Replace `damneddesigns.com` with your actual domain!

---

### 3. Create TypeScript Configuration for Dashboard

Create `backend/tsconfig.dashboard.json`:

```json
{
    "compilerOptions": {
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "jsx": "react-jsx",
        "composite": true,
        "paths": {
            "@/gql": ["./src/gql/graphql.ts"],
            "@/vdb/*": ["./node_modules/@vendure/dashboard/src/lib/*"]
        }
    },
    "include": ["./src/plugins/**/dashboard/*", "./src/gql/**/*.ts", "vite.*.*ts"]
}
```

---

### 4. Update Main TypeScript Configuration

Edit `backend/tsconfig.json` - Add these sections:

```json
{
  "exclude": [
    "node_modules",
    "migration.ts",
    "src/plugins/**/ui/*",
    "src/plugins/**/dashboard/*",
    "admin-ui",
    "admin-ui-build",
    "vite.*.*ts",
    "src/gql/**/*.ts",
    "tests/**/*",
    "dist/**/*"
  ],
  "references": [
    {
      "path": "./tsconfig.dashboard.json"
    }
  ]
}
```

---

### 5. Update Vendure Configuration

Edit `backend/src/vendure-config.ts`:

**Remove:**
```typescript
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
```

**Remove from plugins array:**
```typescript
AdminUiPlugin.init({
    route: 'admin',
    port: serverPort,
    adminUiConfig: {
        // ... config
    },
}),
```

**Add comment in plugins array:**
```typescript
// Admin UI is now served via Vite Dashboard (see vite.config.mts)
// Run: npx vite (dev) or npx vite build && npx vite preview (production)
// Dashboard will be available at http://localhost:5173 in dev mode
```

---

### 6. Fix Plugin Module Issues

**Important:** If you have custom plugins with their own `package.json` or `tsconfig.json` files, **remove them**. They cause Vite build failures.

Example - if you have `backend/src/plugins/custom-shipping/package.json`, delete it:

```bash
rm backend/src/plugins/custom-shipping/package.json
rm backend/src/plugins/custom-shipping/tsconfig.json
```

This makes the plugin a regular TypeScript module instead of a separate package.

### 6.1 Fix ES Module Compatibility Issues

**Important:** If your `backend/package.json` has `"type": "module"`, PM2 config files must use `.cjs` extension.

**Rename PM2 config:**
```bash
mv backend/ecosystem.config.js backend/ecosystem.config.cjs
```

**Update Vite config for ES modules** - Edit `backend/vite.config.mts`:

```typescript
import { vendureDashboardPlugin } from '@vendure/dashboard/vite';
import { pathToFileURL, fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { resolve, join, dirname } from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    base: '/admin',
    build: {
        outDir: join(__dirname, 'dist/dashboard'),  // Use __dirname here
    },
    // ... rest of config
});
```

**Why:** In ES modules, `__dirname` is not defined. This fix ensures Vite can resolve paths correctly.

---

### 7. Build the Dashboard

```bash
cd backend
pnpm build:backend
pnpm build:dashboard
```

Verify the build succeeds with no errors.

---

### 8. Configure PM2

**IMPORTANT:** PM2 cannot directly execute `pnpm exec vite preview`. You must create a wrapper script first.

**Step 8.1: Create Dashboard Startup Script**

Create `backend/start-dashboard.sh`:

```bash
#!/bin/bash
cd /home/vendure/damneddesigns/backend
exec pnpm exec vite preview --port 5173 --host
```

**Important:** Update the path to match your project location!

Make it executable:
```bash
chmod +x backend/start-dashboard.sh
```

**Step 8.2: Update PM2 Configuration**

Edit `backend/ecosystem.config.cjs` (note: `.cjs` extension for ES module projects) - Add this new process:

```javascript
{
    name: "dashboard",
    script: "/home/vendure/damneddesigns/backend/start-dashboard.sh",
    cwd: "/home/vendure/damneddesigns/backend",
    instances: 1,
    exec_mode: "fork",
    env: {
        NODE_ENV: "production",
        APP_ENV: "prod"
    },
    max_memory_restart: "512M",
    error_file: "/home/vendure/.pm2/logs/dashboard-error.log",
    out_file: "/home/vendure/.pm2/logs/dashboard-out.log",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z"
}
```

**Important:** Update both `script` and `cwd` paths to match your project location!

**Why use a wrapper script?**
- PM2 cannot properly resolve `pnpm` in its PATH
- The wrapper script provides correct execution context
- Prevents continuous crash/restart loops

---

### 9. Update Nginx Configuration

Edit your nginx config file (e.g., `damneddesigns.conf`):

**CRITICAL - Docker Networking:** If nginx runs in Docker, you CANNOT use `127.0.0.1` or `localhost`. You must use the host's IP address because Docker containers have isolated network namespaces.

**Update the `/admin` location block with XSS protection:**

```nginx
# Admin Dashboard - React-based (port 5173) - SECURED
location /admin {
    # Block XSS injection attempts
    if ($args ~ "(<|%3C).*script.*(>|%3E)") {
        return 403 "XSS attempt blocked";
    }
    if ($args ~ "(javascript:|data:|vbscript:)") {
        return 403 "Script injection blocked";
    }
    if ($request_uri ~ "(<|%3C).*script.*(>|%3E)") {
        return 403 "XSS attempt blocked";
    }

    # Note: Using host IP because nginx runs in Docker container
    # Cannot use 127.0.0.1 as that refers to the container, not the host
    proxy_pass http://5.78.142.235:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Scheme $scheme;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;

    # Enhanced Security Headers for Admin Panel
    add_header Strict-Transport-Security $hsts_header always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';" always;
    add_header X-Served-By $host;

    # Hide server info
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;
}
```

**Also update `/admin-api` and `/shop-api` locations:**

```nginx
# Admin API (port 3000) - SECURED
location /admin-api {
    # Block XSS and injection attempts
    if ($args ~ "(<|%3C).*script.*(>|%3E)") {
        return 403 "XSS attempt blocked";
    }
    if ($args ~ "(javascript:|data:|vbscript:)") {
        return 403 "Script injection blocked";
    }

    # Note: Using host IP because nginx runs in Docker container
    proxy_pass http://5.78.142.235:3000$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Scheme $scheme;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;

    # Enhanced Security headers
    add_header Strict-Transport-Security $hsts_header always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Served-By $host;

    # Hide server info
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;
}

# Shop API (port 3000) - SECURED
location /shop-api {
    # Block XSS and injection attempts
    if ($args ~ "(<|%3C).*script.*(>|%3E)") {
        return 403 "XSS attempt blocked";
    }
    if ($args ~ "(javascript:|data:|vbscript:)") {
        return 403 "Script injection blocked";
    }

    # Note: Using host IP because nginx runs in Docker container
    proxy_pass http://5.78.142.235:3000$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Scheme $scheme;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_http_version 1.1;

    # Enhanced Security headers
    add_header Strict-Transport-Security $hsts_header always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Served-By $host;

    # Hide server info
    proxy_hide_header X-Powered-By;
    proxy_hide_header Server;
}
```

**Important:** Replace `5.78.142.235` with your server's IP address!

**How to find your server IP:**
```bash
# Get primary network interface IP
ip addr show | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1 | head -1

# Or use hostname command
hostname -I | awk '{print $1}'
```

---

### 10. PCI Compliance - Firewall Configuration (CRITICAL)

**⚠️ SECURITY REQUIREMENT:** Ports 3000, 4000, and 5173 MUST be blocked from external access. Without firewall rules, attackers can bypass nginx XSS protection by accessing ports directly, violating PCI DSS Requirement 6.5.7.

#### 10.1 Understanding the Security Layer

Your application has multiple security layers:
1. **Layer 1 - Firewall (UFW)**: Blocks direct external access to application ports
2. **Layer 2 - Nginx**: XSS filters check all requests before forwarding
3. **Layer 3 - Application**: Vendure's built-in security features

**Without the firewall:**
- ❌ Attacker can access `http://yourip:5173/admin` directly → bypasses nginx XSS filters
- ❌ Attacker can access `http://yourip:3000/admin-api` directly → bypasses nginx security
- ❌ PCI compliance FAILED

**With the firewall:**
- ✅ External users must go through nginx (ports 80/443) → XSS filters enforced
- ✅ Docker containers can still access host services → application works
- ✅ Localhost can still access ports → maintenance/debugging possible
- ✅ PCI compliance PASSED

#### 10.2 Create Firewall Configuration Script

Create `scripts/secure-ports.sh`:

```bash
#!/bin/bash
# PCI Compliance: Block direct access to application ports
# Only nginx (via Docker network) and localhost should access these ports

echo "🔒 Securing application ports for PCI compliance..."

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "❌ UFW not installed. Installing..."
    apt-get update && apt-get install -y ufw
fi

# Enable UFW if not already enabled
if ! ufw status | grep -q "Status: active"; then
    echo "📋 Enabling UFW firewall..."
    ufw --force enable
fi

# Allow SSH (port 22) - CRITICAL: Don't lock yourself out!
echo "✅ Allowing SSH (port 22)..."
ufw allow 22/tcp

# Allow HTTP and HTTPS (nginx ports)
echo "✅ Allowing HTTP (80) and HTTPS (443)..."
ufw allow 80/tcp
ufw allow 443/tcp

# First, check Docker networks
echo "🔍 Detecting Docker networks..."
DOCKER_BRIDGE_NET="172.17.0.0/16"
NGINX_NET=$(docker inspect YOUR-NGINX-CONTAINER-NAME | grep -A 3 '"Gateway"' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1 | sed 's/\.[0-9]*$/.0.0\/16/')

if [ -z "$NGINX_NET" ]; then
    echo "⚠️  Could not detect nginx network, using default 172.22.0.0/16"
    NGINX_NET="172.22.0.0/16"
fi

echo "   Docker bridge: $DOCKER_BRIDGE_NET"
echo "   Nginx network: $NGINX_NET"

# Allow Docker networks to access application ports FIRST (before deny rules)
echo "✅ Allowing Docker bridge networks to access application ports..."

# Allow Docker bridge network (172.17.0.0/16)
ufw allow from $DOCKER_BRIDGE_NET to any port 3000 proto tcp comment 'Docker bridge to Vendure API'
ufw allow from $DOCKER_BRIDGE_NET to any port 4000 proto tcp comment 'Docker bridge to Frontend'
ufw allow from $DOCKER_BRIDGE_NET to any port 5173 proto tcp comment 'Docker bridge to Dashboard'
echo "   - Allowed Docker bridge ($DOCKER_BRIDGE_NET)"

# Allow nginx network
ufw allow from $NGINX_NET to any port 3000 proto tcp comment 'nginx to Vendure API'
ufw allow from $NGINX_NET to any port 4000 proto tcp comment 'nginx to Frontend'
ufw allow from $NGINX_NET to any port 5173 proto tcp comment 'nginx to Dashboard'
echo "   - Allowed nginx network ($NGINX_NET)"

# Allow localhost access (127.0.0.1)
ufw allow from 127.0.0.1 to any port 3000 proto tcp comment 'localhost to Vendure API'
ufw allow from 127.0.0.1 to any port 4000 proto tcp comment 'localhost to Frontend'
ufw allow from 127.0.0.1 to any port 5173 proto tcp comment 'localhost to Dashboard'
echo "   - Allowed localhost (127.0.0.1)"

# Block direct access to application ports from external networks
echo "🚫 Blocking direct external access to application ports..."

# Block port 3000 (Vendure API) - only accessible via nginx/localhost/docker
ufw deny from any to any port 3000 proto tcp comment 'Block external Vendure API'
echo "   - Blocked external access to port 3000 (Vendure API)"

# Block port 4000 (Frontend) - only accessible via nginx/localhost/docker
ufw deny from any to any port 4000 proto tcp comment 'Block external Frontend'
echo "   - Blocked external access to port 4000 (Frontend)"

# Block port 5173 (Dashboard) - only accessible via nginx/localhost/docker
ufw deny from any to any port 5173 proto tcp comment 'Block external Dashboard'
echo "   - Blocked external access to port 5173 (Dashboard)"

# Block port 5432 (PostgreSQL) - already localhost-only but add firewall rule
ufw deny from any to any port 5432 proto tcp comment 'Block external PostgreSQL'
echo "   - Blocked external access to port 5432 (PostgreSQL)"

# Reload firewall
echo "🔄 Reloading firewall..."
ufw reload

# Show status
echo ""
echo "✅ Firewall configuration complete!"
echo ""
echo "📊 Current firewall status:"
ufw status numbered | grep -E "(3000|4000|5173|5432)"

echo ""
echo "🔍 Verification commands:"
echo "  - Test dashboard via nginx: curl -I https://yourdomain.com/admin"
echo "  - Test XSS protection: curl -I 'https://yourdomain.com/admin?test=<script>alert(1)</script>'"
echo "  - Expected: nginx returns 403 'XSS attempt blocked'"
echo ""
echo "⚠️  IMPORTANT: Nginx can still access these ports because it connects from Docker network"
echo "   External attackers cannot bypass nginx security filters anymore."
```

Make it executable:
```bash
chmod +x scripts/secure-ports.sh
```

**Important:** Replace `YOUR-NGINX-CONTAINER-NAME` with your actual nginx container name.

#### 10.3 Create Firewall Fix Script (For Troubleshooting)

If you run the firewall script multiple times or rules get out of order, use this fix script.

Create `scripts/fix-firewall-rules.sh`:

```bash
#!/bin/bash
# Fix UFW rules to allow Docker networks while blocking external access
# This script deletes existing rules and re-adds them in the correct order

echo "🔧 Fixing UFW firewall rules..."

# First, delete all rules for ports 3000, 4000, 5173, 5432
echo "🗑️  Removing existing rules for application ports..."

# Keep trying to delete rules until there are no more
while sudo ufw status numbered | grep -E " (3000|4000|5173|5432)" > /dev/null; do
    # Get the first rule number for these ports and delete it
    RULE_NUM=$(sudo ufw status numbered | grep -E " (3000|4000|5173|5432)" | head -1 | awk -F'[][]' '{print $2}')
    if [ -n "$RULE_NUM" ]; then
        echo "   - Deleting rule #$RULE_NUM"
        echo "y" | sudo ufw delete $RULE_NUM
    else
        break
    fi
done

echo ""
echo "✅ Adding rules in correct order..."

# Detect Docker networks
DOCKER_BRIDGE_NET="172.17.0.0/16"
NGINX_NET=$(docker inspect YOUR-NGINX-CONTAINER-NAME | grep -A 3 '"Gateway"' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1 | sed 's/\.[0-9]*$/.0.0\/16/')

if [ -z "$NGINX_NET" ]; then
    echo "⚠️  Could not detect nginx network, using default 172.22.0.0/16"
    NGINX_NET="172.22.0.0/16"
fi

# Step 1: Allow Docker bridge networks FIRST (these must come before deny rules)
echo "📋 Step 1: Allow Docker networks..."
sudo ufw insert 1 allow from $DOCKER_BRIDGE_NET to any port 3000 proto tcp comment 'Docker bridge to Vendure API'
sudo ufw insert 2 allow from $DOCKER_BRIDGE_NET to any port 4000 proto tcp comment 'Docker bridge to Frontend'
sudo ufw insert 3 allow from $DOCKER_BRIDGE_NET to any port 5173 proto tcp comment 'Docker bridge to Dashboard'

sudo ufw insert 4 allow from $NGINX_NET to any port 3000 proto tcp comment 'nginx to Vendure API'
sudo ufw insert 5 allow from $NGINX_NET to any port 4000 proto tcp comment 'nginx to Frontend'
sudo ufw insert 6 allow from $NGINX_NET to any port 5173 proto tcp comment 'nginx to Dashboard'

# Step 2: Allow localhost
echo "📋 Step 2: Allow localhost..."
sudo ufw insert 7 allow from 127.0.0.1 to any port 3000 proto tcp comment 'localhost to Vendure API'
sudo ufw insert 8 allow from 127.0.0.1 to any port 4000 proto tcp comment 'localhost to Frontend'
sudo ufw insert 9 allow from 127.0.0.1 to any port 5173 proto tcp comment 'localhost to Dashboard'

# Step 3: Deny everything else (these rules will be evaluated last)
echo "📋 Step 3: Deny external access..."
sudo ufw deny from any to any port 3000 proto tcp comment 'Block external Vendure API'
sudo ufw deny from any to any port 4000 proto tcp comment 'Block external Frontend'
sudo ufw deny from any to any port 5173 proto tcp comment 'Block external Dashboard'
sudo ufw deny from any to any port 5432 proto tcp comment 'Block external PostgreSQL'

# Reload firewall
echo ""
echo "🔄 Reloading firewall..."
sudo ufw reload

# Show status
echo ""
echo "✅ Firewall rules fixed!"
echo ""
echo "📊 Current firewall status:"
sudo ufw status numbered | grep -E "(3000|4000|5173|5432)"

echo ""
echo "🔍 Verification:"
echo "  - Docker networks should be ALLOWED (rules 1-6)"
echo "  - Localhost should be ALLOWED (rules 7-9)"
echo "  - Everything else should be DENIED (later rules)"
```

Make it executable:
```bash
chmod +x scripts/fix-firewall-rules.sh
```

**Important:** Replace `YOUR-NGINX-CONTAINER-NAME` in both scripts.

#### 10.4 Run Firewall Configuration

**First time setup:**
```bash
sudo bash scripts/secure-ports.sh
```

**If nginx times out after firewall setup (rules out of order):**
```bash
sudo bash scripts/fix-firewall-rules.sh
```

#### 10.5 Verify Firewall Configuration

**Check UFW rule order (CRITICAL):**
```bash
sudo ufw status numbered
```

**Expected output:**
```
[ 1] 3000/tcp    ALLOW IN    172.17.0.0/16   # Docker bridge to Vendure API
[ 2] 4000/tcp    ALLOW IN    172.17.0.0/16   # Docker bridge to Frontend
[ 3] 5173/tcp    ALLOW IN    172.17.0.0/16   # Docker bridge to Dashboard
[ 4] 3000/tcp    ALLOW IN    172.22.0.0/16   # nginx to Vendure API
[ 5] 4000/tcp    ALLOW IN    172.22.0.0/16   # nginx to Frontend
[ 6] 5173/tcp    ALLOW IN    172.22.0.0/16   # nginx to Dashboard
[ 7] 3000/tcp    ALLOW IN    127.0.0.1       # localhost to Vendure API
[ 8] 4000/tcp    ALLOW IN    127.0.0.1       # localhost to Frontend
[ 9] 5173/tcp    ALLOW IN    127.0.0.1       # localhost to Dashboard
[15] 3000/tcp    DENY IN     Anywhere        # Block external Vendure API
[16] 4000/tcp    DENY IN     Anywhere        # Block external Frontend
[17] 5173/tcp    DENY IN     Anywhere        # Block external Dashboard
[18] 5432/tcp    DENY IN     Anywhere        # Block external PostgreSQL
```

**Rule order is CRITICAL:** ALLOW rules must come BEFORE DENY rules. UFW processes rules top-to-bottom, first match wins.

**Test from server (should work):**
```bash
# These should return 200 OK because localhost is allowed
curl -I http://127.0.0.1:5173/admin
curl -I http://127.0.0.1:3000/admin-api
```

**Test via nginx (should work):**
```bash
# Should return 200 OK
curl -I https://yourdomain.com/admin

# Should return 405 (Method Not Allowed - correct for HEAD request)
curl -I https://yourdomain.com/admin-api
```

**Test XSS protection (should block):**
```bash
# Should return 403 "XSS attempt blocked"
curl -I "https://yourdomain.com/admin?test=<script>alert(1)</script>"
```

**Note:** Testing direct port access from the same server will succeed because localhost is explicitly allowed. To properly test external blocking, you need to test from a different machine/IP.

#### 10.6 Find Your Docker Network

If you need to manually find your Docker network subnets:

```bash
# Find nginx container name
docker ps | grep nginx

# Inspect nginx container network
docker inspect YOUR-NGINX-CONTAINER-NAME | grep -A 10 "Networks"

# Get gateway IP
docker inspect YOUR-NGINX-CONTAINER-NAME | grep "Gateway"
```

Typical Docker networks:
- **Standard bridge**: `172.17.0.0/16`
- **Custom networks**: `172.18.0.0/16`, `172.19.0.0/16`, `172.20.0.0/16`, etc.

---

### 11. Deploy to Production

**If using Docker nginx:**

```bash
# Copy updated config to container
docker cp damneddesigns.conf nginx-brotli-damneddesigns:/etc/nginx/conf.d/damneddesigns.conf

# Test and reload nginx
docker exec nginx-brotli-damneddesigns nginx -t
docker exec nginx-brotli-damneddesigns nginx -s reload
```

**If using native nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### 12. Start the Dashboard

```bash
# Start the dashboard process
pm2 start ecosystem.config.cjs --only dashboard

# Save PM2 configuration
pm2 save
```

**Note:** Use `.cjs` extension if your project uses ES modules (`"type": "module"` in package.json).

---

### 13. Verify Installation

1. **Check PM2 status:**
   ```bash
   pm2 status
   ```
   You should see: admin, worker, dashboard, store, redis-monitor

2. **Check dashboard logs:**
   ```bash
   pm2 logs dashboard --lines 20
   ```

3. **Access the dashboard:**
   - Open: `https://yourdomain.com/admin`
   - Login with your admin credentials
   - Verify all features work

---

## Troubleshooting

### Issue: "Blocked request. This host is not allowed"

**Solution:** Add your domain to `allowedHosts` in `vite.config.mts`:

```typescript
preview: {
    allowedHosts: ['yourdomain.com', 'localhost'],
}
```

### Issue: "Failed to construct 'URL': Invalid URL"

**Solution:** Ensure `api.host` in `vite.config.mts` is a full URL with protocol:

```typescript
api: {
    host: 'https://yourdomain.com',  // ✅ Correct
    // host: '/admin-api',            // ❌ Wrong
    // host: '',                      // ❌ Wrong
}
```

### Issue: Vite build fails with module resolution errors

**Solution:** Remove `package.json` and `tsconfig.json` from custom plugin directories:

```bash
find backend/src/plugins -name "package.json" -delete
find backend/src/plugins -name "tsconfig.json" -delete
```

### Issue: Dashboard shows 404 errors

**Solution:** Verify nginx config is loaded in the container and dashboard process is running:

```bash
pm2 status
docker exec nginx-container cat /etc/nginx/conf.d/yourconfig.conf | grep -A 10 "location /admin"
```

### Issue: Dashboard returns 502 Bad Gateway after setup

**Symptoms:**
- Nginx returns "502 Bad Gateway"
- Error logs show: `connect() failed (111: Connection refused)`

**Cause:** Nginx is trying to connect to `127.0.0.1` but it's running in Docker where `127.0.0.1` refers to the container, not the host.

**Solution:**
1. Find your server IP: `hostname -I | awk '{print $1}'`
2. Update all nginx proxy_pass directives to use server IP instead of `127.0.0.1`:
   ```nginx
   # Change from:
   proxy_pass http://127.0.0.1:5173;

   # To:
   proxy_pass http://YOUR_SERVER_IP:5173;
   ```
3. Copy config to container and reload:
   ```bash
   docker cp yourconfig.conf nginx-container:/etc/nginx/conf.d/
   docker exec nginx-container nginx -t
   docker exec nginx-container nginx -s reload
   ```

### Issue: Dashboard times out after setting up firewall

**Symptoms:**
- `curl https://yourdomain.com/admin` times out (no response)
- Dashboard worked before running firewall script
- Error logs show: `upstream timed out (110: Operation timed out)`

**Cause:** UFW firewall rules are in wrong order - DENY rules are being processed before ALLOW rules.

**Solution:**
1. Run the firewall fix script:
   ```bash
   sudo bash scripts/fix-firewall-rules.sh
   ```
2. Verify rule order - ALLOW rules must come FIRST:
   ```bash
   sudo ufw status numbered | grep -E "(3000|4000|5173)"
   ```
3. Test dashboard access:
   ```bash
   curl -I https://yourdomain.com/admin
   ```

**Why this happens:** When you run `ufw allow` followed by `ufw deny`, UFW may not preserve the order. The fix script uses `ufw insert` with specific positions to ensure ALLOW rules are at the top.

### Issue: PM2 dashboard process keeps crashing

**Symptoms:**
- `pm2 status` shows dashboard with high restart count
- Dashboard status: "errored" or constantly restarting
- Logs show: `/usr/bin/bash: vite: No such file or directory`

**Causes and Solutions:**

**Cause 1: PM2 can't find pnpm/vite in PATH**

**Solution:** Create wrapper script (see Step 8.1):
```bash
# Create backend/start-dashboard.sh
#!/bin/bash
cd /home/vendure/yourproject/backend
exec pnpm exec vite preview --port 5173 --host

# Make executable
chmod +x backend/start-dashboard.sh

# Update PM2 config to use script path
script: "/home/vendure/yourproject/backend/start-dashboard.sh"
```

**Cause 2: ES module compatibility - module.exports not defined**

**Solution:** Rename PM2 config:
```bash
mv backend/ecosystem.config.js backend/ecosystem.config.cjs
```

**Cause 3: Syntax error in vendure-config.ts**

**Solution:** Check for multi-line ternary expressions or complex conditionals. Replace with IIFE:
```typescript
// Instead of complex ternary:
ssl: condition1 ? {
    value1
} : condition2 ? {
    value2
} : false,

// Use IIFE:
ssl: (() => {
    if (condition1) return { value1 };
    if (condition2) return { value2 };
    return false;
})(),
```

### Issue: XSS protection not working

**Symptoms:**
- `curl -I "https://yourdomain.com/admin?test=<script>alert(1)</script>"` returns 200 instead of 403

**Solution:**
1. Verify XSS filters are in nginx config (see Step 9)
2. Copy updated config to container:
   ```bash
   docker cp yourconfig.conf nginx-container:/etc/nginx/conf.d/
   docker exec nginx-container nginx -s reload
   ```
3. Test again - should return 403 "XSS attempt blocked"

### Issue: External users can still access ports directly

**Symptoms:**
- Someone reports they can access `http://yourip:5173/admin` directly
- Firewall is configured but not blocking

**Diagnosis:**
```bash
# Check UFW is active
sudo ufw status

# Check rule order
sudo ufw status numbered | grep -E "(3000|4000|5173)"
```

**Solution:**
1. Ensure UFW is enabled: `sudo ufw enable`
2. Run fix script to correct rule order: `sudo bash scripts/fix-firewall-rules.sh`
3. Verify DENY rules exist for "Anywhere"

**Note:** Testing from the server itself will always work because localhost (127.0.0.1) is explicitly allowed. You must test from an external machine/IP.

---

## What Changed

### Removed
- ❌ `@vendure/admin-ui-plugin` (Angular-based)
- ❌ AdminUiPlugin from vendure-config.ts
- ❌ Plugin-specific package.json files (caused build issues)

### Added
- ✅ `@vendure/dashboard` (React-based)
- ✅ `vite` dev dependency
- ✅ `vite.config.mts` configuration
- ✅ `tsconfig.dashboard.json` for TypeScript
- ✅ PM2 dashboard process
- ✅ Nginx proxy for /admin → port 5173

### Modified
- 🔄 `tsconfig.json` - Added dashboard references and exclusions
- 🔄 `package.json` - Added build scripts
- 🔄 `ecosystem.config.js` - Added dashboard process
- 🔄 Nginx config - Updated /admin location

---

## Production Checklist

Before deploying to production:

**Build & Configuration:**
- [ ] All dependencies installed (`pnpm install`)
- [ ] Backend builds successfully (`pnpm build:backend`)
- [ ] Dashboard builds successfully (`pnpm build:dashboard`)
- [ ] Domain name updated in `vite.config.mts`
- [ ] Server IP updated in nginx config (if using Docker)

**ES Module Compatibility (if package.json has "type": "module"):**
- [ ] PM2 config renamed to `.cjs` extension
- [ ] Vite config has `__dirname` workaround
- [ ] No syntax errors in vendure-config.ts (avoid multi-line ternaries)

**PM2 Configuration:**
- [ ] Wrapper script created (`backend/start-dashboard.sh`)
- [ ] Wrapper script is executable (`chmod +x`)
- [ ] PM2 config updated with dashboard process using wrapper script path
- [ ] PM2 config saved (`pm2 save`)

**Nginx Configuration:**
- [ ] XSS protection added to `/admin`, `/admin-api`, `/shop-api` locations
- [ ] All `127.0.0.1` changed to server IP (if using Docker)
- [ ] Security headers added (X-Frame-Options, CSP, etc.)
- [ ] Config copied to container (if using Docker)
- [ ] Nginx config tested (`nginx -t`)
- [ ] Nginx reloaded

**PCI Compliance & Security:**
- [ ] Firewall scripts created (`secure-ports.sh` and `fix-firewall-rules.sh`)
- [ ] Nginx container name updated in firewall scripts
- [ ] Firewall script executed (`sudo bash scripts/secure-ports.sh`)
- [ ] UFW rule order verified (ALLOW rules before DENY rules)
- [ ] XSS protection tested - returns 403 for script injection
- [ ] Dashboard accessible via nginx at `https://yourdomain.com/admin`

**Verification:**
- [ ] Dashboard process started and running (`pm2 status`)
- [ ] Can access dashboard at `/admin` via HTTPS
- [ ] Can login and perform admin tasks
- [ ] All custom plugins still work
- [ ] XSS test returns 403: `curl -I "https://yourdomain.com/admin?test=<script>alert(1)</script>"`
- [ ] Dashboard via nginx works: `curl -I https://yourdomain.com/admin` returns 200
- [ ] Admin API via nginx works: `curl -I https://yourdomain.com/admin-api` returns 405

---

## Rollback Plan

If issues occur, rollback is simple:

1. **Stop dashboard process:**
   ```bash
   pm2 stop dashboard
   pm2 delete dashboard
   ```

2. **Restore AdminUiPlugin in vendure-config.ts:**
   ```bash
   git revert <commit-hash>
   ```

3. **Rebuild and restart:**
   ```bash
   pnpm build:backend
   pm2 restart admin worker
   ```

4. **Restore nginx config:**
   ```bash
   git checkout HEAD~1 damneddesigns.conf
   docker cp damneddesigns.conf nginx-container:/etc/nginx/conf.d/
   docker exec nginx-container nginx -s reload
   ```

---

## Favicon Implementation

### Overview

The favicon system is implemented to serve consistent branding across both frontend and backend applications. The implementation includes support for light/dark mode variants and proper fallbacks.

### Architecture

The favicon system uses a dual-approach architecture:

1. **Frontend**: Direct static file serving via Nginx for frontend pages
2. **Backend**: Middleware-based serving with redirect logic for backend/admin routes

### Files Structure

```
backend/static/
├── favicon.svg          # Default favicon (light mode)
├── favicon-dark.svg     # Dark mode variant
└── favicon-light.svg    # Light mode variant

frontend/public/
├── favicon.svg          # Default favicon (light mode)
├── favicon-dark.svg     # Dark mode variant
└── favicon-light.svg    # Light mode variant
```

### Backend Middleware Configuration

The backend includes middleware in `vendure-config.ts` to handle favicon requests:

```typescript
// Favicon middleware - serves favicon files from static directory
app.use((req, res, next) => {
  const faviconPaths = ['/favicon.png', '/favicon.svg', '/favicon-dark.svg', '/favicon-light.svg'];
  
  if (faviconPaths.includes(req.path)) {
    // Redirect .png requests to .svg for consistency
    if (req.path === '/favicon.png') {
      return res.redirect(301, '/favicon.svg');
    }
    
    const staticPath = path.join(__dirname, 'static');
    const filePath = path.join(staticPath, req.path);
    
    if (fs.existsSync(filePath)) {
      const mimeType = req.path.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
      return res.sendFile(filePath);
    }
  }
  
  next();
});
```

### Nginx Configuration

The Nginx configuration includes specific routing for favicon files to ensure proper handling:

```nginx
# Favicon routing - proxy to backend for proper middleware handling
location ~* ^/favicon\.(png|svg|ico)$ {
    proxy_pass http://5.78.142.235:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $http_connection;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Cache favicon files
    add_header Cache-Control "public, max-age=86400";
    expires 1d;
}
```

### Frontend Head Configuration

The frontend's `head.tsx` includes comprehensive favicon links:

```typescript
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-dark.svg" type="image/svg+xml" media="(prefers-color-scheme: dark)" />
<link rel="icon" href="/favicon-light.svg" type="image/svg+xml" media="(prefers-color-scheme: light)" />
<link rel="apple-touch-icon" href="/favicon.svg" />
```

### Why Separate Nginx Block is Needed

The separate Nginx block for favicons is necessary because:

1. **Route Precedence**: Without it, the general static file regex `location ~* ^/[^/]+\.(avif|webp|png|jpg|jpeg|gif|css|js|woff|woff2)$` would intercept favicon requests and route them to the frontend server instead of the backend.

2. **Middleware Logic**: The backend middleware handles the redirect from `.png` to `.svg` and serves the appropriate file based on the request.

3. **Consistent Behavior**: Both frontend and backend need access to the same favicon files, but with different serving logic.

### Troubleshooting Favicon Issues

#### Issue: Favicon returns 404

**Symptoms:**
- `curl https://yourdomain.com/favicon.png` returns 404
- Browser shows broken favicon icon

**Diagnosis:**
1. Check if Nginx is intercepting the request:
   ```bash
   curl -I https://yourdomain.com/favicon.png
   # Look for x-not-found header indicating backend received request
   ```

2. Verify Nginx configuration:
   ```bash
   docker exec nginx-container nginx -t
   ```

3. Check backend middleware logs:
   ```bash
   pm2 logs admin --lines 20
   ```

**Solutions:**
1. **Add favicon location block to Nginx config** (most common fix)
2. **Restart Nginx after config changes:**
   ```bash
   docker exec nginx-container nginx -s reload
   ```
3. **Restart backend processes:**
   ```bash
   pm2 restart admin worker
   ```

#### Issue: Favicon works but wrong variant loads

**Solution:** Check file existence and permissions:
```bash
ls -la backend/static/favicon*
ls -la frontend/public/favicon*
```

### Implementation Checklist

When setting up favicons on a new deployment:

- [ ] Copy favicon files to `backend/static/` directory
- [ ] Copy favicon files to `frontend/public/` directory  
- [ ] Add favicon middleware to `vendure-config.ts`
- [ ] Add favicon location block to Nginx configuration
- [ ] Test favicon endpoints: `/favicon.png`, `/favicon.svg`
- [ ] Verify redirect from `.png` to `.svg` works
- [ ] Check both light and dark mode variants load
- [ ] Restart backend processes and reload Nginx
- [ ] Test in browser with different color scheme preferences

---

## Notes

### Architecture
- The Dashboard runs as a separate Vite process on port 5173
- The backend API still runs on port 3000
- Nginx proxies `/admin` to the Dashboard (5173)
- Nginx proxies `/admin-api` to the backend (3000)
- All backend plugins are unaffected by this change
- Custom UI extensions need to be rewritten in React (future work)
- Favicon system supports both frontend and backend with proper routing

### Security Layers
1. **Firewall (UFW)**: Blocks direct external access to ports 3000, 4000, 5173
2. **Nginx**: XSS protection filters all requests before forwarding
3. **Application**: Vendure's built-in security features

### Docker Networking
- Docker containers have isolated network namespaces
- `127.0.0.1` in a container ≠ `127.0.0.1` on the host
- Must use host IP address for nginx to reach host services
- Docker networks (typically 172.17.0.0/16, 172.22.0.0/16) must be allowed in firewall

### ES Module Compatibility
- If `package.json` has `"type": "module"`, use `.cjs` extension for CommonJS files
- PM2 config must be `.cjs` in ES module projects
- Vite config needs `__dirname` workaround for ES modules
- Avoid complex multi-line ternary expressions in config files

### PCI Compliance
- **Requirement 6.5.7 (XSS Protection)**: PASSED ✅
- XSS filters implemented in nginx for `/admin`, `/admin-api`, `/shop-api`
- Direct port access blocked via firewall
- External users must go through nginx security layer

---

**Document Version:** 2.0
**Last Updated:** October 10, 2025
**Author:** Damned Designs Development Team

**Changelog:**
- **v2.0 (2025-10-10)**: Added PCI compliance firewall configuration, Docker networking fixes, ES module compatibility, comprehensive troubleshooting, XSS protection implementation
- **v1.1 (2025-01)**: Added favicon implementation
- **v1.0 (2025-01)**: Initial React Dashboard implementation

