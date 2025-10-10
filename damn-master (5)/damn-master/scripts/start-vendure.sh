#!/bin/bash

# Vendure PM2 Startup Script
# Run this script after server reboot to start all Vendure processes

echo "🚀 Starting Vendure processes..."

# Change to project directory
cd /home/vendure/damneddesigns

# Start backend processes (admin, workers, redis-monitor)
echo "📦 Starting backend processes..."
cd backend
pm2 start ecosystem.config.js

# Start frontend store process
echo "🛍️ Starting frontend store..."
cd ../frontend
pm2 start --name store "pnpm preview" --cwd /home/vendure/damneddesigns/frontend

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Show status
echo "📊 Current PM2 status:"
pm2 status

echo "✅ Vendure startup complete!"
echo ""
echo "🌐 Services should be available at:"
echo "   - Admin: http://localhost:3000/admin"
echo "   - Store: http://localhost:4173"
echo ""
echo "📝 To monitor processes: pm2 monit"
echo "📋 To view logs: pm2 logs"
echo "🔄 To restart all: pm2 restart all"
