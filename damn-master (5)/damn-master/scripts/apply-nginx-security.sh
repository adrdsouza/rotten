#!/bin/bash

# Quick Security Fix Application Script
# This script applies the immediate Nginx fixes for Docker deployment

set -e

echo "🔒 Applying Immediate Security Fixes (Docker Nginx)..."

# Test Nginx configuration in Docker
echo "📋 Testing Nginx configuration..."
if docker exec nginx-brotli-damneddesigns nginx -t; then
    echo "✅ Nginx configuration is valid"
    
    echo "🔄 Reloading Nginx with enhanced security..."
    docker exec nginx-brotli-damneddesigns nginx -s reload
    
    # Check if container is still running
    if docker ps | grep -q nginx-brotli-damneddesigns; then
        echo "✅ Nginx reloaded successfully"
    else
        echo "❌ Nginx container stopped after reload"
        exit 1
    fi
else
    echo "❌ Nginx configuration has errors"
    echo "Please check the configuration manually"
    exit 1
fi

echo
echo "🎉 Immediate security fixes applied!"
echo
echo "📋 Applied fixes:"
echo "  ✅ Enhanced XSS protection on all endpoints"
echo "  ✅ Additional security headers"
echo "  ✅ Server information hiding"
echo "  ✅ Input validation for common attack patterns"
echo "  ❌ Rate limiting REMOVED (per user request due to traffic issues)"
echo
echo "⚠️  To complete the full security fix (database exposure), run:"
echo "    sudo /home/vendure/damneddesigns/scripts/fix-security-vulnerabilities.sh"
echo
echo "🔍 To monitor security status, run:"
echo "    /home/vendure/damneddesigns/scripts/security-monitor.sh"
echo
echo "🐳 Note: Nginx is running in Docker container 'nginx-brotli-damneddesigns'"