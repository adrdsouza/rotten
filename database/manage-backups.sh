#!/bin/bash

# 🚀 BACKUP MANAGEMENT SCRIPT
# Manage full and incremental backups

GDRIVE_FULL="gdrive:RottenHand-Backups/database/full"
GDRIVE_INCREMENTAL="gdrive:RottenHand-Backups/database/incremental"

case ${1:-status} in
    status)
        echo "🚀 BACKUP STATUS"
        echo "==============="
        echo ""
        
        echo "📅 Full Backups:"
        rclone lsf "$GDRIVE_FULL/" | tail -3 | while read -r file; do
            echo "   ✅ $file"
        done
        
        echo ""
        echo "📅 Recent Incremental Backups:"
        rclone lsf "$GDRIVE_INCREMENTAL/" | tail -5 | while read -r file; do
            echo "   ✅ $file"
        done
        
        echo ""
        echo "📊 Storage Usage:"
        rclone size "$GDRIVE_FULL/" | head -1
        rclone size "$GDRIVE_INCREMENTAL/" | head -1
        ;;
        
    full)
        echo "🚀 Running manual full backup..."
        ./database/full-backup-to-gdrive.sh
        ;;
        
    incremental)
        echo "🚀 Running manual incremental backup..."
        ./database/incremental-backup-to-gdrive.sh
        ;;
        
    logs)
        echo "📋 Recent Full Backup Logs:"
        tail -10 /home/vendure/rottenhand/logs/database/full-backup.log 2>/dev/null || echo "No full backup logs"
        echo ""
        echo "📋 Recent Incremental Backup Logs:"
        tail -10 /home/vendure/rottenhand/logs/database/incremental-backup.log 2>/dev/null || echo "No incremental backup logs"
        ;;
        
    *)
        echo "Usage: $0 {status|full|incremental|logs}"
        ;;
esac
