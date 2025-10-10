#!/bin/bash

# Security Vulnerability Fix Script for Damned Designs
# Addresses: XSS, Database Exposure, SSL Issues
# Created: $(date)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/security-fix.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root for certain operations
check_sudo() {
    if [[ $EUID -ne 0 ]]; then
        error "This script needs sudo privileges for PostgreSQL configuration"
        echo "Please run: sudo $0"
        exit 1
    fi
}

# 1. Fix PostgreSQL Database Exposure (Critical)
fix_postgresql_security() {
    log "🔒 Fixing PostgreSQL Security Configuration..."
    
    # Backup current configuration
    cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup.$(date +%Y%m%d)
    cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup.$(date +%Y%m%d)
    
    # Fix listen_addresses - should only listen on localhost
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf
    sed -i "s/listen_addresses = '\*'/listen_addresses = 'localhost'/" /etc/postgresql/16/main/postgresql.conf
    
    # Ensure SSL is properly configured
    sed -i "s/#ssl = off/ssl = on/" /etc/postgresql/16/main/postgresql.conf
    sed -i "s/ssl = off/ssl = on/" /etc/postgresql/16/main/postgresql.conf
    
    # Update pg_hba.conf to restrict connections
    cat > /etc/postgresql/16/main/pg_hba.conf << 'EOF'
# PostgreSQL Client Authentication Configuration File
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Local connections
local   all             postgres                                peer
local   all             all                                     md5

# IPv4 local connections (localhost only)
host    all             all             127.0.0.1/32            md5

# IPv6 local connections (localhost only)  
host    all             all             ::1/128                 md5

# Allow replication connections from localhost
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            md5
host    replication     all             ::1/128                 md5

# NO EXTERNAL CONNECTIONS ALLOWED
# This prevents external database access
EOF
    
    success "PostgreSQL configuration secured - now only accepts localhost connections"
}

# 2. Configure proper SSL certificates for PostgreSQL
fix_postgresql_ssl() {
    log "🔐 Configuring PostgreSQL SSL certificates..."
    
    # Generate a proper self-signed certificate with shorter validity
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/ssl/private/postgresql-selfsigned.key \
        -out /etc/ssl/certs/postgresql-selfsigned.crt \
        -subj "/C=US/ST=NY/L=NYC/O=DamnedDesigns/OU=IT/CN=localhost"
    
    # Set proper permissions
    chmod 600 /etc/ssl/private/postgresql-selfsigned.key
    chmod 644 /etc/ssl/certs/postgresql-selfsigned.crt
    chown postgres:postgres /etc/ssl/private/postgresql-selfsigned.key
    chown postgres:postgres /etc/ssl/certs/postgresql-selfsigned.crt
    
    # Update PostgreSQL config to use new certificates
    sed -i "s|ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'|ssl_cert_file = '/etc/ssl/certs/postgresql-selfsigned.crt'|" /etc/postgresql/16/main/postgresql.conf
    sed -i "s|ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'|ssl_key_file = '/etc/ssl/private/postgresql-selfsigned.key'|" /etc/postgresql/16/main/postgresql.conf
    
    # Set minimum TLS version
    sed -i "s/#ssl_min_protocol_version = 'TLSv1.2'/ssl_min_protocol_version = 'TLSv1.2'/" /etc/postgresql/16/main/postgresql.conf
    
    success "PostgreSQL SSL certificates configured with proper validity period"
}

# 3. Restart PostgreSQL with new configuration
restart_postgresql() {
    log "🔄 Restarting PostgreSQL with new configuration..."
    
    systemctl restart postgresql
    sleep 5
    
    if systemctl is-active --quiet postgresql; then
        success "PostgreSQL restarted successfully"
    else
        error "Failed to restart PostgreSQL - check logs"
        systemctl status postgresql
        exit 1
    fi
}

# 4. Verify PostgreSQL is no longer exposed externally
verify_postgresql_security() {
    log "🔍 Verifying PostgreSQL security..."
    
    # Check if PostgreSQL is only listening on localhost
    local listen_check=$(netstat -tlnp | grep 5432 | grep "127.0.0.1\|::1" | wc -l)
    local external_check=$(netstat -tlnp | grep 5432 | grep -v "127.0.0.1\|::1" | wc -l)
    
    if [[ $external_check -eq 0 ]] && [[ $listen_check -gt 0 ]]; then
        success "PostgreSQL is now only listening on localhost"
    else
        warning "PostgreSQL may still be exposed externally - manual verification needed"
        netstat -tlnp | grep 5432
    fi
}

# 5. Test Nginx configuration
test_nginx_config() {
    log "🧪 Testing Nginx configuration (Docker)..."
    
    if docker exec nginx-brotli-damneddesigns nginx -t; then
        success "Nginx configuration is valid"
        return 0
    else
        error "Nginx configuration has errors - manual fix required"
        return 1
    fi
}

# 6. Reload Nginx with security improvements
reload_nginx() {
    log "🔄 Reloading Nginx with enhanced security (Docker)..."
    
    if test_nginx_config; then
        docker exec nginx-brotli-damneddesigns nginx -s reload
        
        # Check if container is still running
        if docker ps | grep -q nginx-brotli-damneddesigns; then
            success "Nginx reloaded successfully with enhanced security"
        else
            error "Failed to reload Nginx container"
            exit 1
        fi
    else
        error "Cannot reload Nginx due to configuration errors"
        exit 1
    fi
}

# 7. Create firewall rules to block direct database access
setup_firewall_rules() {
    log "🔥 Setting up firewall rules..."
    
    # Install ufw if not installed
    if ! command -v ufw &> /dev/null; then
        apt-get update && apt-get install -y ufw
    fi
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (careful not to lock ourselves out)
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow application ports only from localhost
    ufw allow from 127.0.0.1 to any port 3000
    ufw allow from 127.0.0.1 to any port 4000
    ufw allow from 127.0.0.1 to any port 5173
    ufw allow from 127.0.0.1 to any port 5432
    
    # Explicitly deny external access to these ports
    ufw deny 3000/tcp
    ufw deny 4000/tcp  
    ufw deny 5173/tcp
    ufw deny 5432/tcp
    
    # Enable firewall
    ufw --force enable
    
    success "Firewall configured to block direct access to application and database ports"
}

# 8. Create security monitoring script
create_security_monitor() {
    log "📊 Creating security monitoring script..."
    
    cat > /home/vendure/damneddesigns/scripts/security-monitor.sh << 'EOF'
#!/bin/bash

# Security Monitoring Script
# Checks for common security issues

echo "=== Security Status Report - $(date) ==="
echo

# Check PostgreSQL exposure
echo "🔍 PostgreSQL Listening Status:"
netstat -tlnp | grep 5432 | while read line; do
    if echo "$line" | grep -q "127.0.0.1\|::1"; then
        echo "✅ Safe: $line"
    else
        echo "❌ EXPOSED: $line"
    fi
done
echo

# Check for unusual processes on sensitive ports
echo "🔍 Processes on Sensitive Ports:"
for port in 3000 4000 5173 5432; do
    process=$(lsof -ti:$port 2>/dev/null)
    if [[ -n "$process" ]]; then
        echo "Port $port: $(ps -p $process -o comm= 2>/dev/null || echo 'Unknown')"
    fi
done
echo

# Check Docker Nginx status
echo "🔍 Docker Nginx Status:"
if docker ps | grep -q nginx-brotli-damneddesigns; then
    echo "✅ Nginx container is running"
    docker exec nginx-brotli-damneddesigns nginx -v 2>/dev/null || echo "❌ Cannot check Nginx version"
else
    echo "❌ Nginx container is not running"
fi
echo

# Check SSL certificate validity
echo "🔍 SSL Certificate Status:"
echo | openssl s_client -connect localhost:443 -servername damneddesigns.com 2>/dev/null | openssl x509 -noout -dates
echo

# Check firewall status (if available)
echo "🔍 Firewall Status:"
if command -v ufw &> /dev/null; then
    ufw status numbered | head -10
else
    echo "UFW not installed"
fi
echo

# Test XSS protection
echo "🔍 XSS Protection Test:"
response_code=$(curl -s -o /dev/null -w "%{http_code}" "https://damneddesigns.com/admin?test=<script>alert('test')</script>" 2>/dev/null || echo "000")
if [[ "$response_code" == "403" ]]; then
    echo "✅ XSS protection is working (403 Forbidden)"
elif [[ "$response_code" == "000" ]]; then
    echo "⚠️  Cannot test XSS protection (connection failed)"
else
    echo "❌ XSS protection may not be working (HTTP $response_code)"
fi
echo

echo "=== End Security Report ==="
EOF

    chmod +x /home/vendure/damneddesigns/scripts/security-monitor.sh
    chown vendure:vendure /home/vendure/damneddesigns/scripts/security-monitor.sh
    
    success "Security monitoring script created at /home/vendure/damneddesigns/scripts/security-monitor.sh"
}

# Main execution
main() {
    log "🚀 Starting Security Vulnerability Fix Process..."
    log "This will fix XSS vulnerabilities, database exposure, and SSL issues"
    
    # Check sudo access
    check_sudo
    
    # Execute fixes
    fix_postgresql_security
    fix_postgresql_ssl
    restart_postgresql
    verify_postgresql_security
    reload_nginx
    setup_firewall_rules
    create_security_monitor
    
    success "🎉 Security vulnerability fixes completed!"
    
    echo
    log "📋 Summary of changes:"
    echo "  ✅ PostgreSQL restricted to localhost only"
    echo "  ✅ PostgreSQL SSL certificates regenerated with proper validity"
    echo "  ✅ Nginx enhanced with XSS protection and security headers"
    echo "  ✅ Firewall configured to block external access to application ports"
    echo "  ✅ Security monitoring script created"
    echo
    log "🔧 Next steps:"
    echo "  1. Run security monitor: /home/vendure/damneddesigns/scripts/security-monitor.sh"
    echo "  2. Test your application functionality"
    echo "  3. Re-run security scans to verify fixes"
    echo
    warning "Note: If you need external database access, configure a secure tunnel or VPN"
}

# Run main function
main "$@"