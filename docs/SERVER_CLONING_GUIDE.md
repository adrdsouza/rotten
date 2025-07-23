# 🚀 Complete Server Cloning Guide for Rotten Hand

This guide provides step-by-step instructions for cloning your Vendure 3.3.5 ecommerce site to a new server, including database setup, environment configuration, and deployment.

## 📋 Prerequisites

Before starting, ensure you have:
- [ ] Root/sudo access to the new server
- [ ] GitHub repository access (`https://github.com/adrdsouza/damn.git`)
- [ ] Database dump file from the original server
- [ ] Environment variables from the original server
- [ ] Domain/DNS configuration ready (if applicable)

## 🗂️ Project Structure Overview

```
/home/vendure/rottenhand/
├── backend/           # Vendure 3.3.5 backend (Node.js/TypeScript)
├── frontend/          # Qwik storefront
├── database/          # Database scripts and backups
├── docs/             # Documentation
└── ecosystem files   # PM2 configuration
```

## 🛠️ Step 1: Server Preparation

### 1.1 Create User and Directory Structure
```bash
# Create vendure user
sudo useradd -m -s /bin/bash vendure
sudo usermod -aG sudo vendure

# Switch to vendure user
sudo su - vendure

# Create project directory
mkdir -p /home/vendure/rottenhand
cd /home/vendure/rottenhand
```

### 1.2 Install Required Software
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+ (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm (required - this project uses pnpm, not npm)
npm install -g pnpm

# Install PM2 globally
npm install -g pm2

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Git
sudo apt install -y git

# Install nginx (if not already installed)
sudo apt install -y nginx
```

## 🗄️ Step 2: Database Setup

### 2.1 Configure PostgreSQL
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE vendure_db;
CREATE USER vendureuser WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE vendure_db TO vendureuser;
ALTER USER vendureuser CREATEDB;
\q
EOF
```

### 2.2 Optimize PostgreSQL Configuration
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Add/modify these settings:
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
```

### 2.3 Restore Database from Dump
```bash
# Copy your database dump to the server (replace with your actual dump file)
# If using custom format (.dump):
pg_restore --clean --no-acl --no-owner -h localhost -U vendureuser -d vendure_db /path/to/your/backup.dump

# If using SQL format (.sql):
psql -h localhost -U vendureuser -d vendure_db < /path/to/your/backup.sql

# Verify restoration
psql -h localhost -U vendureuser -d vendure_db -c "SELECT count(*) FROM \"order\";"
```

## 📁 Step 3: Clone and Setup Code

### 3.1 Clone Repository
```bash
cd /home/vendure/rottenhand
git clone https://github.com/adrdsouza/damn.git .

# Verify the clone
ls -la
# Should see: backend/ frontend/ database/ docs/ etc.
```

### 3.2 Install Dependencies
```bash
# Backend dependencies
cd backend
pnpm install

# Frontend dependencies  
cd ../frontend
pnpm install

# Return to root
cd ..
```

## ⚙️ Step 4: Environment Configuration

### 4.1 Backend Environment Variables
```bash
cd backend
cp .env.security.example .env

# Edit the .env file with your actual values
nano .env
```

**Required Backend Environment Variables:**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vendure_db
DB_USERNAME=vendureuser
DB_PASSWORD=your_secure_password_here
DB_SCHEMA=public
DB_SSL=false

# Application Configuration
NODE_ENV=production
APP_ENV=prod
PORT=3000
COOKIE_SECRET=your_very_long_random_string_here

# Admin Configuration
SUPERADMIN_USERNAME=admin
SUPERADMIN_PASSWORD=your_secure_admin_password

# Email Configuration (Gmail SMTP)
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password

# Security (if using reCAPTCHA)
RECAPTCHA_ENTERPRISE_PROJECT_ID=your_project_id
RECAPTCHA_ENTERPRISE_SITE_KEY=your_site_key
RECAPTCHA_ENTERPRISE_SECRET_KEY=your_secret_key

# Redis (if using)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Logging
LOG_BASE_PATH=/home/vendure/rottenhand/backend/logs
```

### 4.2 Frontend Environment Variables
```bash
cd ../frontend
cp .env.example .env.production

# Edit the production environment file
nano .env.production
```

**Required Frontend Environment Variables:**
```bash
# API Configuration (update with your domain)
VITE_VENDURE_DEV_URL=https://yourdomain.com
VITE_VENDURE_LOCAL_URL=https://yourdomain.com  
VITE_VENDURE_PROD_URL=https://yourdomain.com

# Instance Configuration
VITE_IS_READONLY_INSTANCE=false
VITE_SHOW_PAYMENT_STEP=true
VITE_SHOW_REVIEWS=true
VITE_SECURE_COOKIE=true

# Payment Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_actual_stripe_key
NMI_SECURITY_KEY=your_nmi_security_key

# Apple Pay (if using)
APPLE_PAY_MERCHANT_ID=merchant.com.yourdomain
APPLE_PAY_ENABLED=true

# Google Services
VITE_GOOGLE_ADDRESS_VALIDATION_API_KEY=your_google_api_key
```

## 🏗️ Step 5: Build and Deploy

### 5.1 Build Applications
```bash
# Build backend
cd backend
pnpm build

# Build frontend
cd ../frontend  
pnpm build

# Return to root
cd ..
```

### 5.2 Setup PM2 Configuration
The ecosystem files are already configured. Update paths if needed:

```bash
# Check backend PM2 config
cat backend/ecosystem.config.js

# Check frontend PM2 config  
cat frontend/ecosystem.config.cjs
```

### 5.3 Start Services with PM2
```bash
# Start backend (admin + worker processes)
cd backend
pm2 start ecosystem.config.js

# Start frontend
cd ../frontend
pm2 start ecosystem.config.cjs

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions provided by the command above
```

## 🌐 Step 6: Nginx Configuration

### 6.1 Create Nginx Site Configuration
```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

**Basic Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (add your SSL certificates)
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # Frontend (Qwik storefront)
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /shop-api {
        proxy_pass http://127.0.0.1:3000/shop-api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /admin-api {
        proxy_pass http://127.0.0.1:3000/admin-api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Admin UI
    location /admin {
        proxy_pass http://127.0.0.1:3000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Assets from backend
    location /assets {
        proxy_pass http://127.0.0.1:3000/assets;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=31536000, immutable";
        expires 1y;
    }
}
```

### 6.2 Enable Site and Restart Nginx
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 🔧 Step 7: Database Migrations and Verification

### 7.1 Run Database Migrations
```bash
cd backend

# Run any pending migrations
pnpm run migration:run

# Verify database structure
psql -h localhost -U vendureuser -d vendure_db -c "\dt"
```

### 7.2 Verify Application Health
```bash
# Check PM2 processes
pm2 status

# Check logs for any errors
pm2 logs admin
pm2 logs worker
pm2 logs store

# Test API endpoints
curl -I http://localhost:3000/admin-api
curl -I http://localhost:4000

# Test through nginx (replace with your domain)
curl -I https://yourdomain.com
curl -I https://yourdomain.com/admin
```

## 📊 Step 8: Setup Monitoring and Backups

### 8.1 Setup Log Monitoring
```bash
cd backend
chmod +x scripts/setup-monitoring.sh
./scripts/setup-monitoring.sh
```

### 8.2 Setup Database Backups
```bash
# Setup automated backups (optional but recommended)
cd database
chmod +x setup-incremental-backups.sh

# Configure rclone for Google Drive backups (follow prompts)
./setup-incremental-backups.sh
```

## 🔍 Step 9: Testing and Validation

### 9.1 Functional Testing Checklist
- [ ] Frontend loads correctly
- [ ] Admin panel accessible
- [ ] Product pages display properly
- [ ] Shopping cart functionality works
- [ ] Checkout process functions
- [ ] Order placement successful
- [ ] Email notifications sent
- [ ] Payment processing works (test mode first)

### 9.2 Performance Testing
```bash
# Check memory usage
pm2 monit

# Test response times
curl -w "@curl-format.txt" -o /dev/null -s https://yourdomain.com

# Monitor database connections
psql -h localhost -U vendureuser -d vendure_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🚨 Troubleshooting Common Issues

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U vendureuser -d vendure_db -c "SELECT version();"

# Check connection limits
psql -h localhost -U vendureuser -d vendure_db -c "SHOW max_connections;"
```

### PM2 Process Issues
```bash
# Restart all processes
pm2 restart all

# Check process details
pm2 describe admin
pm2 describe worker
pm2 describe store

# View detailed logs
pm2 logs --lines 100
```

### Nginx Issues
```bash
# Check nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Environment Variable Issues
```bash
# Verify environment variables are loaded
cd backend
node -e "console.log(process.env.DB_NAME)"

cd ../frontend
node -e "console.log(process.env.VITE_VENDURE_PROD_URL)"
```

## 📝 Step 10: Post-Deployment Checklist

### 10.1 Security Hardening
- [ ] Change all default passwords
- [ ] Setup SSL certificates
- [ ] Configure firewall rules
- [ ] Enable fail2ban (optional)
- [ ] Setup log rotation
- [ ] Configure automated security updates

### 10.2 Performance Optimization
- [ ] Enable gzip compression in nginx
- [ ] Setup CDN for static assets (optional)
- [ ] Configure database connection pooling
- [ ] Setup Redis for caching (optional)
- [ ] Monitor resource usage

### 10.3 Backup Verification
- [ ] Test database backup restoration
- [ ] Verify automated backup schedule
- [ ] Test file system backups
- [ ] Document recovery procedures

## 🎯 Quick Commands Reference

### Daily Operations
```bash
# Check system status
pm2 status
sudo systemctl status nginx postgresql

# View logs
pm2 logs
sudo tail -f /var/log/nginx/access.log

# Restart services
pm2 restart all
sudo systemctl restart nginx

# Database backup
cd database && ./backup-database.sh

# Update code (when needed)
git pull origin master
cd backend && pnpm build && pm2 restart admin worker
cd ../frontend && pnpm build && pm2 restart store
```

### Emergency Recovery
```bash
# Stop all services
pm2 stop all
sudo systemctl stop nginx

# Restore from backup
pg_restore --clean --no-acl --no-owner -h localhost -U vendureuser -d vendure_db /path/to/backup.dump

# Restart services
pm2 start all
sudo systemctl start nginx
```

## 📞 Support and Maintenance

This documentation serves as both a deployment guide and a reference for the AI agent when helping with server management tasks. Keep this document updated as the infrastructure evolves.

### Key Files to Monitor
- `/home/vendure/rottenhand/backend/logs/` - Application logs
- `/var/log/nginx/` - Web server logs
- `/var/log/postgresql/` - Database logs
- `~/.pm2/logs/` - PM2 process logs

### Regular Maintenance Tasks
- Weekly: Review logs for errors
- Monthly: Update dependencies (`pnpm update`)
- Quarterly: Review and update security configurations
- As needed: Scale resources based on traffic patterns

---

**🎉 Congratulations!** Your Rotten Hand Vendure site should now be successfully cloned and running on the new server.
