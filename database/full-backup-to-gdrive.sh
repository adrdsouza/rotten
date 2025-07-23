#!/bin/bash

# 🚀 WEEKLY FULL BACKUP TO GOOGLE DRIVE
# Creates complete database backup and uploads to Google Drive

set -e

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="rotten_db"
DB_USER="vendureuser"
DB_PASSWORD="adrdsouza"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/vendure/rottenhand/database/backups/full"
GDRIVE_DIR="gdrive:RottenHand-Backups/database/full"
LOG_FILE="/home/vendure/rottenhand/database/logs/full-backup.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 Starting weekly full backup"

# Create full backup
BACKUP_FILE="vendure_full_${TIMESTAMP}.dump"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

log "📦 Creating full database backup..."
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
    "$DB_NAME" > "$BACKUP_PATH" 2>> "$LOG_FILE"

if [ -f "$BACKUP_PATH" ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log "✅ Full backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "❌ Full backup failed!"
    exit 1
fi

# Upload to Google Drive
log "☁️  Uploading to Google Drive..."
if rclone copy "$BACKUP_PATH" "$GDRIVE_DIR/" --progress >> "$LOG_FILE" 2>&1; then
    log "✅ Upload successful"
    
    # Verify upload
    if rclone lsf "$GDRIVE_DIR/$BACKUP_FILE" > /dev/null 2>&1; then
        log "✅ Backup verified on Google Drive"
    else
        log "⚠️  Upload completed but verification failed"
    fi
else
    log "❌ Upload failed!"
    exit 1
fi

# Cleanup old full backups (keep 8 weeks = 2 months)
log "🧹 Cleaning up old full backups..."
CUTOFF_DATE=$(date -d '8 weeks ago' +%Y%m%d)

rclone lsf "$GDRIVE_DIR/" | while read -r file; do
    if [[ $file =~ vendure_full_([0-9]{8})_ ]]; then
        FILE_DATE=${BASH_REMATCH[1]}
        if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
            log "🗑️  Deleting old backup: $file"
            rclone delete "$GDRIVE_DIR/$file" >> "$LOG_FILE" 2>&1
        fi
    fi
done

# Cleanup old local backups (keep 2 weeks locally)
find "$BACKUP_DIR" -name "vendure_full_*.dump" -mtime +14 -delete 2>> "$LOG_FILE"

log "🎉 Weekly full backup completed successfully!"
log "   File: $BACKUP_FILE ($BACKUP_SIZE)"

# Create marker file for incremental backups
echo "$TIMESTAMP" > "/home/vendure/rottenhand/database/backups/last_full_backup.txt"
