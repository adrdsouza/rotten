#!/bin/bash

# 🚀 COMPLETE DATABASE BACKUP SCRIPT FOR DAMNED DESIGNS
# Creates a comprehensive backup of the entire Vendure database
# 
# This script creates multiple backup types:
# 1. Full database dump (schema + data)
# 2. Schema-only backup (structure)
# 3. Data-only backup (content)
# 4. Custom format backup (compressed, fastest restore)

set -e  # Exit on any error

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="rotten_db"
DB_USER="vendureuser"
DB_PASSWORD="adrdsouza"
BACKUP_DIR="database/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y-%m-%d)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "🚀 COMPLETE DATABASE BACKUP - Rotten Hand"
echo "============================================="
echo ""
echo "Database: $DB_NAME"
echo "Timestamp: $TIMESTAMP"
echo "Backup Directory: $BACKUP_DIR"
echo ""

# Function to check if PostgreSQL is accessible
check_database() {
    echo "🔍 Checking database connection..."
    if ! PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ Cannot connect to database '$DB_NAME'"
        echo "   Please ensure PostgreSQL is running and database exists"
        exit 1
    fi
    echo "✅ Database connection successful"
    echo ""
}

# Function to get database size
get_database_info() {
    echo "📊 Database Information:"
    
    # Get database size
    DB_SIZE=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
    echo "   Database Size: $DB_SIZE"

    # Get table count
    TABLE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "   Tables: $TABLE_COUNT"

    # Get largest tables
    echo "   Largest Tables:"
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 5;
    " | head -10
    echo ""
}

# Function to create full backup
create_full_backup() {
    local backup_file="$BACKUP_DIR/vendure_full_backup_$TIMESTAMP.sql"
    
    echo "📦 Creating full database backup..."
    echo "   File: $backup_file"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        --verbose \
        --clean \
        --no-acl \
        --no-owner \
        --format=plain \
        "$DB_NAME" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo "   ✅ Full backup created: $file_size"
        echo "      File: $backup_file"
    else
        echo "   ❌ Full backup failed!"
        return 1
    fi
}

# Function to create schema-only backup
create_schema_backup() {
    local backup_file="$BACKUP_DIR/vendure_schema_$TIMESTAMP.sql"
    
    echo "🏗️  Creating schema-only backup..."
    echo "   File: $backup_file"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        --verbose \
        --clean \
        --no-acl \
        --no-owner \
        --schema-only \
        --format=plain \
        "$DB_NAME" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo "   ✅ Schema backup created: $file_size"
    else
        echo "   ❌ Schema backup failed!"
        return 1
    fi
}

# Function to create data-only backup
create_data_backup() {
    local backup_file="$BACKUP_DIR/vendure_data_$TIMESTAMP.sql"
    
    echo "💾 Creating data-only backup..."
    echo "   File: $backup_file"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        --verbose \
        --no-acl \
        --no-owner \
        --data-only \
        --format=plain \
        "$DB_NAME" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo "   ✅ Data backup created: $file_size"
    else
        echo "   ❌ Data backup failed!"
        return 1
    fi
}

# Function to create custom format backup (compressed, fastest restore)
create_custom_backup() {
    local backup_file="$BACKUP_DIR/vendure_custom_$TIMESTAMP.dump"
    
    echo "🗜️  Creating custom format backup (compressed)..."
    echo "   File: $backup_file"
    
    PGPASSWORD=$DB_PASSWORD pg_dump \
        -h $DB_HOST \
        -p $DB_PORT \
        -U $DB_USER \
        --verbose \
        --clean \
        --no-acl \
        --no-owner \
        --format=custom \
        --compress=9 \
        "$DB_NAME" > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        local file_size=$(du -h "$backup_file" | cut -f1)
        echo "   ✅ Custom backup created: $file_size"
        echo "      (Compressed, fastest for restore)"
    else
        echo "   ❌ Custom backup failed!"
        return 1
    fi
}

# Function to create backup summary
create_backup_summary() {
    local summary_file="$BACKUP_DIR/backup_summary_$TIMESTAMP.txt"
    
    echo "📋 Creating backup summary..."
    
    cat > "$summary_file" << EOF
DAMNED DESIGNS DATABASE BACKUP SUMMARY
======================================

Backup Date: $(date)
Database: $DB_NAME
Backup Directory: $BACKUP_DIR

DATABASE INFORMATION:
$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT pg_size_pretty(pg_database_size('$DB_NAME')) as database_size;")

BACKUP FILES CREATED:
EOF

    # List all backup files created today
    find "$BACKUP_DIR" -name "*$TIMESTAMP*" -type f -exec ls -lh {} \; >> "$summary_file"
    
    cat >> "$summary_file" << EOF

RESTORE COMMANDS:
================

Full Restore:
sudo -u postgres psql -d $DB_NAME < $BACKUP_DIR/vendure_full_backup_$TIMESTAMP.sql

Custom Format Restore (Fastest):
sudo -u postgres pg_restore --clean --no-acl --no-owner -d $DB_NAME $BACKUP_DIR/vendure_custom_backup_$TIMESTAMP.dump

Schema Only Restore:
sudo -u postgres psql -d $DB_NAME < $BACKUP_DIR/vendure_schema_$TIMESTAMP.sql

Data Only Restore:
sudo -u postgres psql -d $DB_NAME < $BACKUP_DIR/vendure_data_$TIMESTAMP.sql

VERIFICATION:
============
To verify backup integrity, you can restore to a test database:
sudo -u postgres createdb vendure_test
sudo -u postgres pg_restore --clean --no-acl --no-owner -d vendure_test $BACKUP_DIR/vendure_custom_$TIMESTAMP.dump

CLEANUP:
========
Old backups can be removed manually from: $BACKUP_DIR
Consider keeping at least 7 days of backups for safety.
EOF

    echo "   ✅ Backup summary created: $summary_file"
}

# Function to cleanup old backups (optional)
cleanup_old_backups() {
    echo "🧹 Checking for old backups..."
    
    # Find backups older than 30 days
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "vendure_*" -type f -mtime +30 2>/dev/null | wc -l)
    
    if [ "$OLD_BACKUPS" -gt 0 ]; then
        echo "   Found $OLD_BACKUPS backup files older than 30 days"
        echo "   To clean up old backups, run:"
        echo "   find $BACKUP_DIR -name 'vendure_*' -type f -mtime +30 -delete"
    else
        echo "   No old backups found (keeping all backups < 30 days)"
    fi
    echo ""
}

# Main execution
main() {
    check_database
    get_database_info
    
    echo "🚀 Starting backup process..."
    echo ""
    
    # Create all backup types
    create_full_backup
    echo ""
    
    create_schema_backup
    echo ""
    
    create_data_backup
    echo ""
    
    create_custom_backup
    echo ""
    
    create_backup_summary
    echo ""
    
    cleanup_old_backups
    
    echo "🎉 BACKUP COMPLETE!"
    echo "=================="
    echo ""
    echo "📁 Backup files created in: $BACKUP_DIR"
    echo "📋 Summary file: $BACKUP_DIR/backup_summary_$TIMESTAMP.txt"
    echo ""
    echo "💾 Total backup files:"
    find "$BACKUP_DIR" -name "*$TIMESTAMP*" -type f -exec ls -lh {} \;
    echo ""
    echo "✅ Your database is now safely backed up!"
    echo "   You can now proceed with performance optimizations"
}

# Run the main function
main
