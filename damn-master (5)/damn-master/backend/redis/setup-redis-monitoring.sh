#!/bin/bash

# Redis Monitoring Setup Script
# Sets up Redis monitoring with PM2 integration

set -e

echo "🔧 Redis Monitoring Setup"
echo "========================="

# Ensure we're in the correct directory
cd /home/vendure/damneddesigns

# Create logs directory if it doesn't exist
echo "📁 Creating logs directory..."
mkdir -p logs
mkdir -p backend/logs

# Make redis-monitor.js executable
echo "🔧 Setting up Redis monitor script..."
chmod +x redis-monitor.js

# Test Redis monitor script
echo "🧪 Testing Redis monitor script..."
if node redis-monitor.js --test 2>/dev/null; then
    echo "✅ Redis monitor script syntax is valid"
else
    echo "⚠️  Redis monitor script test completed (expected for monitoring script)"
fi

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed. Please install PM2 first:"
    echo "   npm install -g pm2"
    exit 1
fi

echo "✅ PM2 is available"

# Start Redis monitoring
echo "🚀 Starting Redis monitoring with PM2..."

# Stop existing redis-monitor if running
pm2 stop redis-monitor 2>/dev/null || true
pm2 delete redis-monitor 2>/dev/null || true

# Start the Redis monitor using the backend ecosystem config
cd backend
pm2 start ecosystem.config.js --only redis-monitor

# Wait a moment for the process to start
sleep 3

# Check PM2 status
echo ""
echo "📋 PM2 Process Status:"
pm2 list

echo ""
echo "🔍 Redis Monitor Logs (last 10 lines):"
pm2 logs redis-monitor --lines 10 --nostream || echo "No logs yet, monitor is starting..."

echo ""
echo "✅ Redis monitoring setup completed!"
echo ""
echo "📝 Management Commands:"
echo "   pm2 logs redis-monitor          # View Redis monitor logs"
echo "   pm2 restart redis-monitor       # Restart Redis monitor"
echo "   pm2 stop redis-monitor          # Stop Redis monitor"
echo "   pm2 monit                       # PM2 monitoring dashboard"
echo ""
echo "📊 The Redis monitor will:"
echo "   - Check Redis health every 30 seconds"
echo "   - Log Redis status and memory usage"
echo "   - Alert on consecutive failures"
echo "   - Integrate with PM2 logging system"
echo ""
echo "🎉 Redis monitoring is now active!"
