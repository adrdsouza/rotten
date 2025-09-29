#!/bin/bash

# Disable maintenance mode - restore normal PM2 config
# This is the absolute simplest approach

set -e

FRONTEND_DIR="/home/vendure/rottenhand/frontend"

echo "🔄 Disabling maintenance mode..."

cd "$FRONTEND_DIR"

# Delete maintenance server processes
echo "🗑️  Cleaning up maintenance server processes..."
pm2 delete store || echo "No store processes to clean up"

# Start normal application using ecosystem config
echo "🚀 Starting normal application..."
pm2 start ecosystem.config.cjs

echo ""
echo "✅ MAINTENANCE MODE DISABLED"
echo "   - Normal application is now running on port 4000"
echo ""