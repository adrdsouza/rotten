#!/bin/bash

echo "🚧 ENABLING MAINTENANCE MODE..."

# Stop the existing store process
echo "⏹️  Stopping store process..."
pm2 delete store

# Start simple maintenance server
echo "🔧 Starting simple maintenance server..."
pm2 start scripts/simple-maintenance-server.js --name store

echo ""
echo "✅ MAINTENANCE MODE ENABLED"
echo "   - Maintenance page is now active on port 4000"
echo "   - Use './scripts/maint-off.sh' to restore normal operation"
echo ""
echo ""