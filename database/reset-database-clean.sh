#!/bin/bash

# 🚀 COMPLETE DATABASE RESET FOR CLEAN SLATE
# This script completely drops and recreates the database
# WARNING: This will permanently delete ALL data!

set -e

# Configuration (from your existing setup)
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="rotten_db"
DB_USER="vendureuser"
DB_PASSWORD="adrdsouza"

echo "🚨 WARNING: COMPLETE DATABASE RESET"
echo "=================================="
echo ""
echo "This will PERMANENTLY DELETE all data including:"
echo "- All customers and their data"
echo "- All orders and order history"
echo "- All products and variants"
echo "- All assets and media"
echo "- All configuration and settings"
echo "- All admin users (except superadmin)"
echo ""
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo ""

# Confirmation prompt
read -p "Are you ABSOLUTELY SURE you want to proceed? Type 'YES' to continue: " confirmation

if [ "$confirmation" != "YES" ]; then
    echo "❌ Operation cancelled."
    exit 1
fi

echo ""
echo "🔄 Starting database reset..."

# Stop any running Vendure processes
echo "1️⃣ Stopping Vendure processes..."
pm2 stop all 2>/dev/null || echo "   No PM2 processes to stop"
pkill -f "node.*vendure" 2>/dev/null || echo "   No Vendure processes to kill"

# Wait a moment for connections to close
sleep 3

echo "2️⃣ Dropping existing database..."
# Drop the database (this will fail if there are active connections)
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();
" 2>/dev/null || true

# Drop the database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo "3️⃣ Creating fresh database..."
# Create a new empty database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

echo "4️⃣ Database reset complete!"
echo ""
echo "✅ Fresh database '$DB_NAME' created"
echo ""
echo "🚀 Next steps:"
echo "1. Start your Vendure backend to run migrations:"
echo "   cd backend && npm start"
echo ""
echo "2. The first startup will:"
echo "   - Run all database migrations"
echo "   - Create the superadmin user"
echo "   - Set up the initial database schema"
echo ""
echo "3. You can then populate with fresh data or import new products"
echo ""
echo "🎉 Your database is now completely clean and ready for fresh data!"
