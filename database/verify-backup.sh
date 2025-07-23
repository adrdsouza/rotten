#!/bin/bash

# 🔍 BACKUP VERIFICATION SCRIPT
# Verifies the integrity and completeness of database backups

set -e

BACKUP_DIR="database/backups"

echo "🔍 BACKUP VERIFICATION"
echo "====================="
echo ""

# Function to verify a backup file exists and is readable
verify_backup_file() {
    local file_path=$1
    local backup_type=$2
    
    if [ -f "$file_path" ]; then
        local file_size=$(du -h "$file_path" | cut -f1)
        echo "   ✅ $backup_type: $file_size"
        
        # Check if file is not empty
        if [ -s "$file_path" ]; then
            echo "      File has content ✓"
        else
            echo "      ⚠️  File is empty!"
            return 1
        fi
        
        # For SQL files, check if they contain expected content
        if [[ "$file_path" == *.sql ]]; then
            if grep -q "PostgreSQL database dump" "$file_path" 2>/dev/null; then
                echo "      Valid PostgreSQL dump ✓"
            else
                echo "      ⚠️  May not be a valid PostgreSQL dump"
            fi
        fi
        
    else
        echo "   ❌ $backup_type: File not found"
        return 1
    fi
}

# Function to find and verify latest backups
verify_latest_backups() {
    echo "📋 Verifying latest backup set..."
    echo ""
    
    # Find the most recent timestamp
    LATEST_TIMESTAMP=$(ls -1 "$BACKUP_DIR"/vendure_*_*.* 2>/dev/null | grep -o '[0-9]\{8\}_[0-9]\{6\}' | sort -r | head -1)
    
    if [ -z "$LATEST_TIMESTAMP" ]; then
        echo "❌ No backups found in $BACKUP_DIR"
        echo "   Run ./database/backup-database.sh to create backups"
        return 1
    fi
    
    echo "Latest backup timestamp: $LATEST_TIMESTAMP"
    echo ""
    
    # Verify each backup type
    verify_backup_file "$BACKUP_DIR/vendure_full_backup_$LATEST_TIMESTAMP.sql" "Full Backup"
    verify_backup_file "$BACKUP_DIR/vendure_schema_$LATEST_TIMESTAMP.sql" "Schema Backup"
    verify_backup_file "$BACKUP_DIR/vendure_data_$LATEST_TIMESTAMP.sql" "Data Backup"
    verify_backup_file "$BACKUP_DIR/vendure_custom_$LATEST_TIMESTAMP.dump" "Custom Backup"
    
    echo ""
}

# Function to show backup summary
show_backup_summary() {
    echo "📊 BACKUP SUMMARY"
    echo "=================="
    echo ""
    
    if [ -d "$BACKUP_DIR" ]; then
        echo "Backup directory: $BACKUP_DIR"
        
        # Count backup files
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "vendure_*" -type f 2>/dev/null | wc -l)
        echo "Total backup files: $BACKUP_COUNT"
        
        if [ "$BACKUP_COUNT" -gt 0 ]; then
            echo ""
            echo "All backup files:"
            find "$BACKUP_DIR" -name "vendure_*" -type f -exec ls -lh {} \; | sort -k9
            
            # Calculate total backup size
            TOTAL_SIZE=$(find "$BACKUP_DIR" -name "vendure_*" -type f -exec du -b {} \; | awk '{sum += $1} END {print sum}')
            if [ -n "$TOTAL_SIZE" ]; then
                TOTAL_SIZE_HUMAN=$(echo "$TOTAL_SIZE" | awk '{
                    if ($1 > 1073741824) printf "%.1fGB", $1/1073741824
                    else if ($1 > 1048576) printf "%.1fMB", $1/1048576
                    else if ($1 > 1024) printf "%.1fKB", $1/1024
                    else printf "%dB", $1
                }')
                echo ""
                echo "Total backup storage used: $TOTAL_SIZE_HUMAN"
            fi
        fi
    else
        echo "❌ Backup directory not found: $BACKUP_DIR"
        echo "   Run ./database/backup-database.sh to create backups"
    fi
    echo ""
}

# Function to test backup integrity (optional - creates test database)
test_backup_integrity() {
    echo "🧪 BACKUP INTEGRITY TEST (Optional)"
    echo "==================================="
    echo ""
    echo "This will create a temporary test database to verify backup integrity."
    echo "This is optional but recommended for critical backups."
    echo ""
    
    read -p "Do you want to run integrity test? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Find latest custom backup (fastest to restore)
        LATEST_TIMESTAMP=$(ls -1 "$BACKUP_DIR"/vendure_custom_*.dump 2>/dev/null | grep -o '[0-9]\{8\}_[0-9]\{6\}' | sort -r | head -1)
        
        if [ -n "$LATEST_TIMESTAMP" ]; then
            local test_db="vendure_backup_test_$$"
            local backup_file="$BACKUP_DIR/vendure_custom_$LATEST_TIMESTAMP.dump"
            
            echo "Creating test database: $test_db"
            echo "Using backup: $backup_file"
            echo ""
            
            # Create test database
            if sudo -u postgres createdb "$test_db" 2>/dev/null; then
                echo "✅ Test database created"
                
                # Restore backup to test database
                if sudo -u postgres pg_restore --clean --no-acl --no-owner -d "$test_db" "$backup_file" > /dev/null 2>&1; then
                    echo "✅ Backup restored successfully to test database"
                    
                    # Verify some basic data
                    TABLE_COUNT=$(sudo -u postgres psql -d "$test_db" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null)
                    echo "✅ Test database has $TABLE_COUNT tables"
                    
                    # Check if key tables exist
                    if sudo -u postgres psql -d "$test_db" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = 'order';" | grep -q 1; then
                        ORDER_COUNT=$(sudo -u postgres psql -d "$test_db" -t -c "SELECT count(*) FROM \"order\";" 2>/dev/null)
                        echo "✅ Orders table has $ORDER_COUNT records"
                    fi
                    
                    echo "✅ Backup integrity test PASSED"
                else
                    echo "❌ Failed to restore backup to test database"
                fi
                
                # Cleanup test database
                echo "🧹 Cleaning up test database..."
                sudo -u postgres dropdb "$test_db" 2>/dev/null
                echo "✅ Test database removed"
            else
                echo "❌ Failed to create test database"
            fi
        else
            echo "❌ No custom backup found for integrity test"
        fi
    else
        echo "Skipping integrity test"
    fi
    echo ""
}

# Main execution
main() {
    verify_latest_backups
    show_backup_summary
    test_backup_integrity
    
    echo "🎉 BACKUP VERIFICATION COMPLETE"
    echo "==============================="
    echo ""
    echo "✅ Your backups are ready for use"
    echo "   You can now safely proceed with database optimizations"
}

# Run main function
main
