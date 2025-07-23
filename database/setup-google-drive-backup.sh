#!/bin/bash

# 🚀 GOOGLE DRIVE BACKUP SETUP FOR DAMNED DESIGNS
# Sets up automated database backups to Google Drive using rclone
# 
# This script will:
# 1. Install rclone (Google Drive sync tool)
# 2. Configure Google Drive authentication
# 3. Create automated backup scripts
# 4. Set up cron jobs for daily backups
# 5. Test the backup system

set -e

echo "🚀 GOOGLE DRIVE BACKUP SETUP"
echo "============================"
echo ""
echo "This will set up automated database backups to Google Drive:"
echo "- Daily automatic backups"
echo "- Compressed backup files"
echo "- Retention policy (keep 30 days)"
echo "- Email notifications on success/failure"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo "❌ Please don't run this script as root"
    echo "   Run as the vendure user: ./database/setup-google-drive-backup.sh"
    exit 1
fi

# Function to install rclone
install_rclone() {
    echo "📦 Installing rclone..."
    
    if command -v rclone &> /dev/null; then
        echo "   ✅ rclone is already installed"
        rclone version
        return 0
    fi
    
    # Download and install rclone
    curl https://rclone.org/install.sh | sudo bash
    
    if command -v rclone &> /dev/null; then
        echo "   ✅ rclone installed successfully"
        rclone version
    else
        echo "   ❌ rclone installation failed"
        exit 1
    fi
}

# Function to configure Google Drive
configure_google_drive() {
    echo ""
    echo "🔧 GOOGLE DRIVE CONFIGURATION"
    echo "============================="
    echo ""
    echo "You need to configure rclone to connect to Google Drive."
    echo "This will open an interactive configuration wizard."
    echo ""
    echo "Configuration steps:"
    echo "1. Choose 'n' for new remote"
    echo "2. Name it 'gdrive' (recommended)"
    echo "3. Choose 'Google Drive' from the list"
    echo "4. Leave client_id and client_secret blank (press Enter)"
    echo "5. Choose 'full access' scope"
    echo "6. Leave root_folder_id blank"
    echo "7. Leave service_account_file blank"
    echo "8. Choose 'n' for advanced config"
    echo "9. Choose 'y' for auto config (will open browser)"
    echo "10. Authorize in browser"
    echo "11. Choose 'y' to confirm"
    echo ""
    
    read -p "Ready to configure Google Drive? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rclone config
        
        # Test the configuration
        echo ""
        echo "🧪 Testing Google Drive connection..."
        if rclone lsd gdrive: > /dev/null 2>&1; then
            echo "   ✅ Google Drive connection successful!"
        else
            echo "   ❌ Google Drive connection failed"
            echo "   Please run 'rclone config' manually to fix the configuration"
            exit 1
        fi
    else
        echo "❌ Google Drive configuration skipped"
        echo "   Run 'rclone config' manually when ready"
        exit 1
    fi
}

# Function to create backup directory structure on Google Drive
create_gdrive_structure() {
    echo ""
    echo "📁 Creating Google Drive backup structure..."
    
    # Create backup directories
    rclone mkdir gdrive:RottenHand-Backups
    rclone mkdir gdrive:RottenHand-Backups/database
    rclone mkdir gdrive:RottenHand-Backups/database/daily
    rclone mkdir gdrive:RottenHand-Backups/database/weekly
    rclone mkdir gdrive:RottenHand-Backups/database/monthly
    
    echo "   ✅ Google Drive backup directories created"
    echo "      - RottenHand-Backups/database/daily"
    echo "      - RottenHand-Backups/database/weekly"
    echo "      - RottenHand-Backups/database/monthly"
}

# Function to create automated backup script
create_backup_script() {
    echo ""
    echo "📝 Creating automated backup script..."
    
    cat > database/backup-to-gdrive.sh << 'EOF'
#!/bin/bash

# 🚀 AUTOMATED GOOGLE DRIVE BACKUP SCRIPT
# Creates database backup and uploads to Google Drive

set -e

# Configuration
BACKUP_TYPE=${1:-daily}  # daily, weekly, or monthly
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="rotten_db"
DB_USER="vendureuser"
DB_PASSWORD="adrdsouza"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y-%m-%d)
LOCAL_BACKUP_DIR="/home/vendure/rottenhand/database/backups"
GDRIVE_BACKUP_DIR="gdrive:RottenHand-Backups/database/$BACKUP_TYPE"

# Email settings (optional)
EMAIL_TO="your-email@example.com"  # Change this to your email
SEND_EMAIL=false  # Set to true to enable email notifications

# Logging
LOG_FILE="/home/vendure/rottenhand/database/logs/gdrive-backup.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "🚀 Starting $BACKUP_TYPE backup to Google Drive"

# Create local backup
log "📦 Creating local database backup..."
BACKUP_FILE="vendure_${BACKUP_TYPE}_${TIMESTAMP}.dump"
LOCAL_BACKUP_PATH="$LOCAL_BACKUP_DIR/$BACKUP_FILE"

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
    "$DB_NAME" > "$LOCAL_BACKUP_PATH" 2>> "$LOG_FILE"

if [ -f "$LOCAL_BACKUP_PATH" ]; then
    BACKUP_SIZE=$(du -h "$LOCAL_BACKUP_PATH" | cut -f1)
    log "✅ Local backup created: $BACKUP_FILE ($BACKUP_SIZE)"
else
    log "❌ Local backup failed!"
    exit 1
fi

# Upload to Google Drive
log "☁️  Uploading to Google Drive..."
if rclone copy "$LOCAL_BACKUP_PATH" "$GDRIVE_BACKUP_DIR/" --progress >> "$LOG_FILE" 2>&1; then
    log "✅ Upload to Google Drive successful"
    
    # Verify upload
    if rclone lsf "$GDRIVE_BACKUP_DIR/$BACKUP_FILE" > /dev/null 2>&1; then
        log "✅ Backup verified on Google Drive"
    else
        log "⚠️  Backup upload completed but verification failed"
    fi
else
    log "❌ Upload to Google Drive failed!"
    exit 1
fi

# Cleanup old backups based on type
log "🧹 Cleaning up old backups..."

case $BACKUP_TYPE in
    daily)
        # Keep 30 days of daily backups
        CUTOFF_DATE=$(date -d '30 days ago' +%Y%m%d)
        ;;
    weekly)
        # Keep 12 weeks of weekly backups
        CUTOFF_DATE=$(date -d '12 weeks ago' +%Y%m%d)
        ;;
    monthly)
        # Keep 12 months of monthly backups
        CUTOFF_DATE=$(date -d '12 months ago' +%Y%m%d)
        ;;
esac

# List and delete old backups from Google Drive
rclone lsf "$GDRIVE_BACKUP_DIR/" | while read -r file; do
    if [[ $file =~ vendure_${BACKUP_TYPE}_([0-9]{8})_ ]]; then
        FILE_DATE=${BASH_REMATCH[1]}
        if [ "$FILE_DATE" -lt "$CUTOFF_DATE" ]; then
            log "🗑️  Deleting old backup: $file"
            rclone delete "$GDRIVE_BACKUP_DIR/$file" >> "$LOG_FILE" 2>&1
        fi
    fi
done

# Cleanup old local backups (keep 7 days locally)
find "$LOCAL_BACKUP_DIR" -name "vendure_${BACKUP_TYPE}_*.dump" -mtime +7 -delete 2>> "$LOG_FILE"

# Send email notification (if enabled)
if [ "$SEND_EMAIL" = true ] && command -v mail &> /dev/null; then
    SUBJECT="✅ Rotten Hand - $BACKUP_TYPE backup successful"
    BODY="Database backup completed successfully:
    
Backup: $BACKUP_FILE
Size: $BACKUP_SIZE
Date: $(date)
Type: $BACKUP_TYPE
Location: Google Drive - RottenHand-Backups/database/$BACKUP_TYPE/

Log file: $LOG_FILE"
    
    echo "$BODY" | mail -s "$SUBJECT" "$EMAIL_TO"
fi

log "🎉 $BACKUP_TYPE backup completed successfully!"
log "   File: $BACKUP_FILE ($BACKUP_SIZE)"
log "   Location: Google Drive - RottenHand-Backups/database/$BACKUP_TYPE/"
EOF

    chmod +x database/backup-to-gdrive.sh
    echo "   ✅ Automated backup script created: database/backup-to-gdrive.sh"
}

# Function to set up cron jobs
setup_cron_jobs() {
    echo ""
    echo "⏰ Setting up automated backup schedule..."
    
    # Create cron jobs
    CRON_DAILY="0 2 * * * cd /home/vendure/rottenhand && ./database/backup-to-gdrive.sh daily"
    CRON_WEEKLY="0 3 * * 0 cd /home/vendure/rottenhand && ./database/backup-to-gdrive.sh weekly"
    CRON_MONTHLY="0 4 1 * * cd /home/vendure/rottenhand && ./database/backup-to-gdrive.sh monthly"
    
    # Add cron jobs if they don't exist
    (crontab -l 2>/dev/null | grep -v "backup-to-gdrive.sh"; echo "$CRON_DAILY"; echo "$CRON_WEEKLY"; echo "$CRON_MONTHLY") | crontab -
    
    echo "   ✅ Cron jobs added:"
    echo "      - Daily backup: 2:00 AM every day"
    echo "      - Weekly backup: 3:00 AM every Sunday"
    echo "      - Monthly backup: 4:00 AM on 1st of each month"
    
    # Show current cron jobs
    echo ""
    echo "📋 Current cron schedule:"
    crontab -l | grep -E "(backup-to-gdrive|#.*backup)" || echo "   No backup-related cron jobs found"
}

# Function to test the backup system
test_backup_system() {
    echo ""
    echo "🧪 TESTING BACKUP SYSTEM"
    echo "========================"
    echo ""
    
    read -p "Do you want to run a test backup now? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 Running test backup..."
        ./database/backup-to-gdrive.sh daily
        
        echo ""
        echo "✅ Test backup completed!"
        echo "   Check your Google Drive at: RottenHand-Backups/database/daily/"
    else
        echo "⏭️  Test backup skipped"
    fi
}

# Main execution
main() {
    install_rclone
    configure_google_drive
    create_gdrive_structure
    create_backup_script
    setup_cron_jobs
    test_backup_system
    
    echo ""
    echo "🎉 GOOGLE DRIVE BACKUP SETUP COMPLETE!"
    echo "======================================"
    echo ""
    echo "✅ Setup Summary:"
    echo "   - rclone installed and configured"
    echo "   - Google Drive backup directories created"
    echo "   - Automated backup script created"
    echo "   - Cron jobs scheduled for automatic backups"
    echo ""
    echo "📅 Backup Schedule:"
    echo "   - Daily: 2:00 AM (keeps 30 days)"
    echo "   - Weekly: 3:00 AM Sunday (keeps 12 weeks)"
    echo "   - Monthly: 4:00 AM 1st of month (keeps 12 months)"
    echo ""
    echo "📁 Google Drive Location:"
    echo "   RottenHand-Backups/database/"
    echo ""
    echo "🔧 Manual Commands:"
    echo "   - Test backup: ./database/backup-to-gdrive.sh daily"
    echo "   - View cron jobs: crontab -l"
    echo "   - Check logs: tail -f database/logs/gdrive-backup.log"
    echo "   - List Google Drive backups: rclone lsf gdrive:RottenHand-Backups/database/daily/"
    echo ""
    echo "✅ Your database backups are now automated to Google Drive!"
}

# Run main function
main
