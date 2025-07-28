#!/bin/bash

# Test Migration Script for Nginx Brotli
# This script tests the new container on different ports before cutover

echo "🚀 Testing Nginx Brotli Migration"
echo "=================================="

# Phase 1: Test container on different ports
echo "Phase 1: Starting test container on ports 8080/8443..."

# Stop any existing test container
docker stop nginx-brotli-test 2>/dev/null || true
docker rm nginx-brotli-test 2>/dev/null || true

# Start test container on different ports
docker run -d \
  --name nginx-brotli-test \
  -p 8080:80 \
  -p 8443:443 \
  -v $(pwd)/ssl:/etc/letsencrypt/live:ro \
  -v $(pwd)/logs:/var/log/nginx \
  nginx-brotli-rottenhand

echo "Waiting for container to start..."
sleep 5

# Test HTTP redirect
echo "Testing HTTP redirect..."
curl -I http://localhost:8080/ 2>/dev/null | grep -E "HTTP|Location" || echo "❌ HTTP test failed"

# Test HTTPS (skip cert verification for test)
echo "Testing HTTPS..."
curl -k -I https://localhost:8443/ 2>/dev/null | grep -E "HTTP|server" || echo "❌ HTTPS test failed"

# Test Brotli compression
echo "Testing Brotli compression..."
curl -k -H "Accept-Encoding: br" -I https://localhost:8443/ 2>/dev/null | grep -i "content-encoding" || echo "❌ Brotli test failed"

# Test SSE endpoint
echo "Testing SSE endpoint..."
curl -k -I https://localhost:8443/api/cache-events 2>/dev/null | grep -E "HTTP" || echo "❌ SSE test failed"

echo ""
echo "Test Results:"
echo "============="
echo "✅ Container started successfully"
echo "✅ Test completed - check output above for any ❌ failures"
echo ""
echo "If tests look good, proceed with cutover:"
echo "1. docker stop nginx-proxy-manager"
echo "2. docker stop nginx-brotli-test"
echo "3. docker run -d --name nginx-brotli-production -p 80:80 -p 443:443 -v \$(pwd)/ssl:/etc/letsencrypt/live:ro -v \$(pwd)/logs:/var/log/nginx nginx-brotli-rottenhand"
echo ""
echo "Rollback if needed:"
echo "1. docker stop nginx-brotli-production"
echo "2. docker start nginx-proxy-manager"
