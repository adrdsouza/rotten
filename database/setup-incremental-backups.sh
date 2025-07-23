#!/bin/bash

# 🚀 INCREMENTAL BACKUP SETUP (Manual rclone configuration)
# Sets up weekly full + 6-hourly incremental backups after rclone is configured

set -e

echo "🚀 INCREMENTAL BACKUP SETUP"
echo "==========================="
echo ""
echo "This script sets up:"
echo "- Weekly full backups (Sundays at 2:00 AM)"
echo "- Incremental backups every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)"
echo "- Retention: Full backups (8 weeks), Incremental (7 days)"
echo ""

# Configuration
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="vendure_db"
DB_USER="vendureuser"
DB_PASSWORD="adrdsouza"
BACKUP_BASE_DIR="/home/vendure/damneddesigns/database/backups"
LOG_DIR="/home/vendure/damneddesigns/database/logs"

# Create directories
mkdir -p "$BACKUP_BASE_DIR"/{full,incremental}
mkdir -p "$LOG_DIR"

# Check if rclone is installed
check_rclone() {
    if ! command -v rclone &> /dev/null; then
        echo "❌ rclone is not installed"
        echo ""
        echo "To install rclone, run:"
        echo "  sudo -v && curl https://rclone.org/install.sh | sudo bash"
        echo ""
        echo "Then configure Google Drive:"
        echo "  rclone config"
        echo ""
        echo "After that, run this script again."
        exit 1
    fi
    
    if ! rclone lsd gdrive: > /dev/null 2>&1; then
        echo "❌ Google Drive not configured"
        echo ""
        echo "To configure Google Drive, run:"
        echo "  rclone config"
        echo ""
        echo "Configuration steps:"
        echo "1. Choose 'n' for new remote"
        echo "2. Name: 'gdrive'"
        echo "3. Storage: Choose 'Google Drive' (usually option 15 or 22)"
        echo "4. Client ID: Leave blank (press Enter)"
        echo "5. Client Secret: Leave blank (press Enter)"
        echo "6. Scope: Choose '1' for full access"
        echo "7. Service account file: Leave blank (press Enter)"
        echo "8. Advanced config: Choose 'n'"
        echo "9. Auto config: Choose 'y' (will open browser)"
        echo "10. Authorize in browser"
        echo "11. Confirm: Choose 'y'"
        echo "12. Quit: Choose 'q'"
        echo ""
        echo "After configuration, run this script again."
        exit 1
    fi
    
    echo "✅ rclone is installed and Google Drive is configured"
}

# Function to create Google Drive structure
create_gdrive_structure() {
    echo ""
    echo "📁 Creating Google Drive backup structure..."
    
    rclone mkdir gdrive:DamnedDesigns-Backups/database/full
    rclone mkdir gdrive:DamnedDesigns-Backups/database/incremental
    
    echo "   ✅ Google Drive directories created:"
    echo "      - DamnedDesigns-Backups/database/full"
    echo "      - DamnedDesigns-Backups/database/incremental"
}

# Function to create full backup script
create_full_backup_script() {
    echo ""
    echo "📝 Creating weekly full backup script..."
    
    cat > database/weekly-full-backup.sh << EOF
#!/bin/bash

# 🚀 WEEKLY FULL BACKUP TO GOOGLE DRIVE
set -e

# Configuration
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/full"
GDRIVE_DIR="gdrive:DamnedDesigns-Backups/database/full"
LOG_FILE="$LOG_DIR/full-backup.log"

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" | tee -a "\$LOG_FILE"
}

log "🚀 Starting weekly full backup"

# Create full backup
BACKUP_FILE="vendure_full_\${TIMESTAMP}.dump"
BACKUP_PATH="\$BACKUP_DIR/\$BACKUP_FILE"

log "📦 Creating full database backup..."
PGPASSWORD=\$DB_PASSWORD pg_dump \\
    -h \$DB_HOST \\
    -p \$DB_PORT \\
    -U \$DB_USER \\
    --verbose \\
    --clean \\
    --no-acl \\
    --no-owner \\
    --format=custom \\
    --compress=9 \\
    "\$DB_NAME" > "\$BACKUP_PATH" 2>> "\$LOG_FILE"

if [ -f "\$BACKUP_PATH" ]; then
    BACKUP_SIZE=\$(du -h "\$BACKUP_PATH" | cut -f1)
    log "✅ Full backup created: \$BACKUP_FILE (\$BACKUP_SIZE)"
else
    log "❌ Full backup failed!"
    exit 1
fi

# Upload to Google Drive
log "☁️  Uploading to Google Drive..."
if rclone copy "\$BACKUP_PATH" "\$GDRIVE_DIR/" --progress >> "\$LOG_FILE" 2>&1; then
    log "✅ Upload successful"
else
    log "❌ Upload failed!"
    exit 1
fi

# Cleanup old full backups (keep 8 weeks)
log "🧹 Cleaning up old full backups..."
CUTOFF_DATE=\$(date -d '8 weeks ago' +%Y%m%d)

rclone lsf "\$GDRIVE_DIR/" | while read -r file; do
    if [[ \$file =~ vendure_full_([0-9]{8})_ ]]; then
        FILE_DATE=\${BASH_REMATCH[1]}
        if [ "\$FILE_DATE" -lt "\$CUTOFF_DATE" ]; then
            log "🗑️  Deleting old backup: \$file"
            rclone delete "\$GDRIVE_DIR/\$file" >> "\$LOG_FILE" 2>&1
        fi
    fi
done

# Cleanup old local backups (keep 2 weeks locally)
find "\$BACKUP_DIR" -name "vendure_full_*.dump" -mtime +14 -delete 2>> "\$LOG_FILE"

log "🎉 Weekly full backup completed!"
echo "\$TIMESTAMP" > "$BACKUP_BASE_DIR/last_full_backup.txt"
EOF

    chmod +x database/weekly-full-backup.sh
    echo "   ✅ Weekly full backup script created"
}

# Function to create incremental backup script
create_incremental_backup_script() {
    echo ""
    echo "📝 Creating 6-hourly incremental backup script..."
    
    cat > database/incremental-backup.sh << EOF
#!/bin/bash

# 🚀 6-HOURLY INCREMENTAL BACKUP TO GOOGLE DRIVE
set -e

# Configuration
DB_HOST="$DB_HOST"
DB_PORT="$DB_PORT"
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"
TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/incremental"
GDRIVE_DIR="gdrive:DamnedDesigns-Backups/database/incremental"
LOG_FILE="$LOG_DIR/incremental-backup.log"

log() {
    echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1" | tee -a "\$LOG_FILE"
}

log "🚀 Starting 6-hourly incremental backup"

# Check if we have a recent full backup
LAST_FULL_FILE="$BACKUP_BASE_DIR/last_full_backup.txt"
if [ ! -f "\$LAST_FULL_FILE" ]; then
    log "⚠️  No full backup marker found - running full backup first"
    ./database/weekly-full-backup.sh
    exit 0
fi

LAST_FULL=\$(cat "\$LAST_FULL_FILE")
LAST_FULL_DATE=\$(echo "\$LAST_FULL" | cut -d'_' -f1)
DAYS_SINCE_FULL=\$(( (\$(date +%s) - \$(date -d "\${LAST_FULL_DATE:0:4}-\${LAST_FULL_DATE:4:2}-\${LAST_FULL_DATE:6:2}" +%s)) / 86400 ))

# If last full backup is more than 7 days old, run full backup
if [ \$DAYS_SINCE_FULL -gt 7 ]; then
    log "⚠️  Last full backup is \$DAYS_SINCE_FULL days old - running new full backup"
    ./database/weekly-full-backup.sh
    exit 0
fi

# Create incremental backup focusing on frequently changing tables
BACKUP_FILE="vendure_incremental_\${TIMESTAMP}.sql"
BACKUP_PATH="\$BACKUP_DIR/\$BACKUP_FILE"

log "📦 Creating incremental backup (changed data since \$LAST_FULL)..."

# Backup frequently changing tables with data only
PGPASSWORD=\$DB_PASSWORD pg_dump \\
    -h \$DB_HOST \\
    -p \$DB_PORT \\
    -U \$DB_USER \\
    --verbose \\
    --no-acl \\
    --no-owner \\
    --format=plain \\
    --inserts \\
    --data-only \\
    --table="order" \\
    --table="order_line" \\
    --table="payment" \\
    --table="customer" \\
    --table="session" \\
    --table="history_entry" \\
    --table="job_record" \\
    --table="stock_movement" \\
    "\$DB_NAME" > "\$BACKUP_PATH" 2>> "\$LOG_FILE"

# Compress the backup
gzip "\$BACKUP_PATH"
BACKUP_PATH="\${BACKUP_PATH}.gz"
BACKUP_FILE="\${BACKUP_FILE}.gz"

if [ -f "\$BACKUP_PATH" ]; then
    BACKUP_SIZE=\$(du -h "\$BACKUP_PATH" | cut -f1)
    log "✅ Incremental backup created: \$BACKUP_FILE (\$BACKUP_SIZE)"
else
    log "❌ Incremental backup failed!"
    exit 1
fi

# Upload to Google Drive
log "☁️  Uploading to Google Drive..."
if rclone copy "\$BACKUP_PATH" "\$GDRIVE_DIR/" --progress >> "\$LOG_FILE" 2>&1; then
    log "✅ Upload successful"
else
    log "❌ Upload failed!"
    exit 1
fi

# Cleanup old incremental backups (keep 7 days)
log "🧹 Cleaning up old incremental backups..."
CUTOFF_DATE=\$(date -d '7 days ago' +%Y%m%d)

rclone lsf "\$GDRIVE_DIR/" | while read -r file; do
    if [[ \$file =~ vendure_incremental_([0-9]{8})_ ]]; then
        FILE_DATE=\${BASH_REMATCH[1]}
        if [ "\$FILE_DATE" -lt "\$CUTOFF_DATE" ]; then
            log "🗑️  Deleting old incremental: \$file"
            rclone delete "\$GDRIVE_DIR/\$file" >> "\$LOG_FILE" 2>&1
        fi
    fi
done

# Cleanup old local incrementals (keep 3 days locally)
find "\$BACKUP_DIR" -name "vendure_incremental_*.sql.gz" -mtime +3 -delete 2>> "\$LOG_FILE"

log "🎉 6-hourly incremental backup completed!"
EOF

    chmod +x database/incremental-backup.sh
    echo "   ✅ 6-hourly incremental backup script created"
}

# Function to set up cron jobs
setup_cron_jobs() {
    echo ""
    echo "⏰ Setting up backup schedule..."
    
    # Remove any existing backup cron jobs
    crontab -l 2>/dev/null | grep -v "backup.*gdrive\|full-backup\|incremental-backup\|weekly-full\|incremental" | crontab -
    
    # Add new cron jobs
    (crontab -l 2>/dev/null; cat << EOF
# Damned Designs Database Backup Schedule
# Full backup every Sunday at 2:00 AM
0 2 * * 0 cd /home/vendure/damneddesigns && ./database/weekly-full-backup.sh
# Incremental backups every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)
0 6,12,18,0 * * * cd /home/vendure/damneddesigns && ./database/incremental-backup.sh
EOF
    ) | crontab -
    
    echo "   ✅ Cron jobs scheduled:"
    echo "      - Full backup: Sundays at 2:00 AM"
    echo "      - Incremental: Every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)"
}

# Function to create management script
create_management_script() {
    echo ""
    echo "📝 Creating backup management script..."
    
    cat > database/manage-incremental-backups.sh << 'EOF'
#!/bin/bash

# 🚀 INCREMENTAL BACKUP MANAGEMENT
GDRIVE_FULL="gdrive:DamnedDesigns-Backups/database/full"
GDRIVE_INCREMENTAL="gdrive:DamnedDesigns-Backups/database/incremental"
LOG_DIR="/home/vendure/damneddesigns/database/logs"

case ${1:-status} in
    status)
        echo "🚀 INCREMENTAL BACKUP STATUS"
        echo "============================"
        echo ""
        
        echo "📅 Recent Full Backups:"
        rclone lsf "$GDRIVE_FULL/" 2>/dev/null | tail -3 | while read -r file; do
            if [[ $file =~ vendure_full_([0-9]{8})_([0-9]{6}) ]]; then
                date_str="${BASH_REMATCH[1]}"
                time_str="${BASH_REMATCH[2]}"
                formatted_date=$(date -d "${date_str:0:4}-${date_str:4:2}-${date_str:6:2}" '+%Y-%m-%d')
                echo "   ✅ $formatted_date - $file"
            fi
        done
        
        echo ""
        echo "📅 Recent Incremental Backups:"
        rclone lsf "$GDRIVE_INCREMENTAL/" 2>/dev/null | tail -8 | while read -r file; do
            if [[ $file =~ vendure_incremental_([0-9]{8})_([0-9]{6}) ]]; then
                date_str="${BASH_REMATCH[1]}"
                time_str="${BASH_REMATCH[2]}"
                formatted_date=$(date -d "${date_str:0:4}-${date_str:4:2}-${date_str:6:2}" '+%Y-%m-%d')
                formatted_time="${time_str:0:2}:${time_str:2:2}"
                echo "   ✅ $formatted_date $formatted_time - $file"
            fi
        done
        
        echo ""
        echo "📊 Storage Usage:"
        echo "   Full backups:"
        rclone size "$GDRIVE_FULL/" 2>/dev/null | head -1 || echo "   No data"
        echo "   Incremental backups:"
        rclone size "$GDRIVE_INCREMENTAL/" 2>/dev/null | head -1 || echo "   No data"
        
        echo ""
        echo "⏰ Next Scheduled Backups:"
        echo "   Full: Next Sunday at 2:00 AM"
        NEXT_INCREMENTAL=$(date -d "$(date -d 'now' '+%Y-%m-%d') $(( ($(date +%H) / 6 + 1) * 6 )):00" '+%Y-%m-%d %H:%M')
        echo "   Incremental: $NEXT_INCREMENTAL"
        ;;
        
    full)
        echo "🚀 Running manual full backup..."
        ./database/weekly-full-backup.sh
        ;;
        
    incremental)
        echo "🚀 Running manual incremental backup..."
        ./database/incremental-backup.sh
        ;;
        
    logs)
        echo "📋 Recent Full Backup Logs:"
        tail -10 "$LOG_DIR/full-backup.log" 2>/dev/null || echo "   No full backup logs found"
        echo ""
        echo "📋 Recent Incremental Backup Logs:"
        tail -10 "$LOG_DIR/incremental-backup.log" 2>/dev/null || echo "   No incremental backup logs found"
        ;;
        
    restore)
        echo "🔄 RESTORE INSTRUCTIONS"
        echo "======================"
        echo ""
        echo "To restore from backups:"
        echo ""
        echo "1. Download latest full backup:"
        echo "   rclone copy $GDRIVE_FULL/[backup_file] ./"
        echo ""
        echo "2. Restore full backup:"
        echo "   PGPASSWORD=adrdsouza pg_restore --clean --no-acl --no-owner -d vendure_db [backup_file]"
        echo ""
        echo "3. If needed, apply incremental backups in chronological order:"
        echo "   rclone copy $GDRIVE_INCREMENTAL/[incremental_file] ./"
        echo "   gunzip [incremental_file]"
        echo "   PGPASSWORD=adrdsouza psql -d vendure_db -f [incremental_file.sql]"
        echo ""
        echo "4. Restart Vendure application"
        ;;
        
    *)
        echo "🚀 INCREMENTAL BACKUP MANAGER"
        echo "============================="
        echo ""
        echo "Usage: $0 {status|full|incremental|logs|restore}"
        echo ""
        echo "Commands:"
        echo "  status      - Show backup status and recent backups"
        echo "  full        - Run manual full backup"
        echo "  incremental - Run manual incremental backup"
        echo "  logs        - Show recent backup logs"
        echo "  restore     - Show restore instructions"
        ;;
esac
EOF

    chmod +x database/manage-incremental-backups.sh
    echo "   ✅ Management script created"
}

# Main execution
main() {
    check_rclone
    create_gdrive_structure
    create_full_backup_script
    create_incremental_backup_script
    setup_cron_jobs
    create_management_script
    
    echo ""
    echo "🎉 INCREMENTAL BACKUP SYSTEM READY!"
    echo "==================================="
    echo ""
    echo "✅ Backup Schedule:"
    echo "   - Full backup: Every Sunday at 2:00 AM (keeps 8 weeks)"
    echo "   - Incremental: Every 6 hours at 6 AM, 12 PM, 6 PM, 12 AM (keeps 7 days)"
    echo ""
    echo "📁 Google Drive Structure:"
    echo "   - DamnedDesigns-Backups/database/full/ (weekly full backups)"
    echo "   - DamnedDesigns-Backups/database/incremental/ (6-hourly incremental)"
    echo ""
    echo "🔧 Management Commands:"
    echo "   - Status: ./database/manage-incremental-backups.sh status"
    echo "   - Manual full: ./database/manage-incremental-backups.sh full"
    echo "   - Manual incremental: ./database/manage-incremental-backups.sh incremental"
    echo "   - View logs: ./database/manage-incremental-backups.sh logs"
    echo "   - Restore help: ./database/manage-incremental-backups.sh restore"
    echo ""
    echo "🧪 Test the system:"
    echo "   ./database/manage-incremental-backups.sh incremental"
    echo ""
    echo "✅ Your incremental backup system is now fully configured!"
}

# Run main function
main
