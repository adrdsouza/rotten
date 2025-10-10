#!/bin/bash

# Redis Auto-Restart Configuration Script
# This script configures Redis Docker container with proper restart policies

set -e

echo "🔧 Redis Auto-Restart Configuration"
echo "===================================="

# Check if Redis container exists
if ! docker ps -a | grep -q redis-server; then
    echo "❌ Redis container 'redis-server' not found!"
    exit 1
fi

echo "📋 Current Redis container status:"
docker ps -a | grep redis-server

echo ""
echo "🔍 Current restart policy:"
docker inspect redis-server --format='{{.HostConfig.RestartPolicy.Name}}'

echo ""
echo "🛠️  Updating Redis container with auto-restart policy..."

# Stop the current Redis container
echo "⏹️  Stopping current Redis container..."
docker stop redis-server

# Update the container with restart policy
echo "🔄 Updating restart policy to 'unless-stopped'..."
docker update --restart=unless-stopped redis-server

# Start the Redis container
echo "▶️  Starting Redis container with new restart policy..."
docker start redis-server

# Wait a moment for Redis to start
sleep 3

echo ""
echo "✅ Redis auto-restart configuration completed!"
echo ""
echo "📋 Updated container status:"
docker ps | grep redis-server

echo ""
echo "🔍 New restart policy:"
docker inspect redis-server --format='{{.HostConfig.RestartPolicy.Name}}'

echo ""
echo "🧪 Testing Redis connectivity..."
if docker exec redis-server redis-cli ping | grep -q PONG; then
    echo "✅ Redis is responding correctly!"
else
    echo "❌ Redis connectivity test failed!"
    exit 1
fi

echo ""
echo "📝 Restart Policy Explanation:"
echo "   - 'unless-stopped': Container will restart automatically unless manually stopped"
echo "   - This ensures Redis restarts after system reboots or container crashes"
echo "   - Manual 'docker stop' commands will still work and prevent auto-restart"

echo ""
echo "🎉 Redis auto-restart configuration is now active!"
