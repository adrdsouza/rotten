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