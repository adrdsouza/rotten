#!/bin/bash

# 🚀 GOOGLE DRIVE BACKUP MANAGEMENT SCRIPT
# Monitor, manage, and restore Google Drive backups

set -e

GDRIVE_BASE="gdrive:DamnedDesigns-Backups/database"
LOCAL_BACKUP_DIR="/home/vendure/damneddesigns/database/backups"
LOG_FILE="/home/vendure/damneddesigns/database/logs/gdrive-backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}🚀 GOOGLE DRIVE BACKUP MANAGER${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

# Function to check if rclone is configured
check_rclone() {
    if ! command -v rclone &> /dev/null; then
        echo -e "${RED}❌ rclone is not installed${NC}"
        echo "   Run ./database/setup-google-drive-backup.sh first"
        exit 1
    fi
    
    if ! rclone lsd gdrive: > /dev/null 2>&1; then
        echo -e "${RED}❌ Google Drive not configured${NC}"
        echo "   Run 'rclone config' to set up Google Drive"
        exit 1
    fi
}

# Function to list all backups
list_backups() {
    echo -e "${BLUE}📋 BACKUP INVENTORY${NC}"
    echo "=================="
    echo ""
    
    for backup_type in daily weekly monthly; do
        echo -e "${YELLOW}📅 ${backup_type^} Backups:${NC}"
        
        if rclone lsf "$GDRIVE_BASE/$backup_type/" > /dev/null 2>&1; then
            rclone ls "$GDRIVE_BASE/$backup_type/" | while read -r size file; do
                # Extract date from filename
                if [[ $file =~ vendure_${backup_type}_([0-9]{8})_([0-9]{6}) ]]; then
                    date_str="${BASH_REMATCH[1]}"
                    time_str="${BASH_REMATCH[2]}"
                    formatted_date=$(date -d "${date_str:0:4}-${date_str:4:2}-${date_str:6:2}" '+%Y-%m-%d')
                    formatted_time="${time_str:0:2}:${time_str:2:2}:${time_str:4:2}"
                    size_mb=$(echo "scale=1; $size / 1024 / 1024" | bc)
                    echo "   ✅ $formatted_date $formatted_time - ${size_mb}MB - $file"
                fi
            done
        else
            echo "   📭 No $backup_type backups found"
        fi
        echo ""
    done
}

# Function to show backup status
show_status() {
    echo -e "${BLUE}📊 BACKUP STATUS${NC}"
    echo "================"
    echo ""
    
    # Check last backup times
    for backup_type in daily weekly monthly; do
        echo -e "${YELLOW}${backup_type^} Backups:${NC}"
        
        latest_backup=$(rclone lsf "$GDRIVE_BASE/$backup_type/" 2>/dev/null | grep "vendure_$backup_type" | sort -r | head -1)
        
        if [ -n "$latest_backup" ]; then
            if [[ $latest_backup =~ vendure_${backup_type}_([0-9]{8})_([0-9]{6}) ]]; then
                date_str="${BASH_REMATCH[1]}"
                time_str="${BASH_REMATCH[2]}"
                backup_date=$(date -d "${date_str:0:4}-${date_str:4:2}-${date_str:6:2} ${time_str:0:2}:${time_str:2:2}:${time_str:4:2}")
                days_ago=$(( ($(date +%s) - $(date -d "$backup_date" +%s)) / 86400 ))
                
                if [ $days_ago -eq 0 ]; then
                    echo -e "   ✅ Latest: Today at $(date -d "$backup_date" '+%H:%M')"
                elif [ $days_ago -eq 1 ]; then
                    echo -e "   ✅ Latest: Yesterday at $(date -d "$backup_date" '+%H:%M')"
                else
                    echo -e "   ⚠️  Latest: $days_ago days ago ($backup_date)"
                fi
            fi
        else
            echo -e "   ${RED}❌ No backups found${NC}"
        fi
        echo ""
    done
    
    # Check cron jobs
    echo -e "${YELLOW}Scheduled Jobs:${NC}"
    if crontab -l 2>/dev/null | grep -q "backup-to-gdrive.sh"; then
        echo "   ✅ Cron jobs are configured"
        crontab -l | grep "backup-to-gdrive.sh" | while read -r job; do
            echo "      $job"
        done
    else
        echo -e "   ${RED}❌ No cron jobs found${NC}"
    fi
    echo ""
    
    # Check recent log entries
    if [ -f "$LOG_FILE" ]; then
        echo -e "${YELLOW}Recent Activity:${NC}"
        tail -5 "$LOG_FILE" | while read -r line; do
            echo "   $line"
        done
    else
        echo -e "${YELLOW}Recent Activity:${NC}"
        echo "   📭 No log file found"
    fi
}

# Function to download a backup
download_backup() {
    echo -e "${BLUE}📥 DOWNLOAD BACKUP${NC}"
    echo "=================="
    echo ""
    
    echo "Available backups:"
    list_backups
    
    echo ""
    read -p "Enter backup filename to download: " backup_file
    
    if [ -z "$backup_file" ]; then
        echo -e "${RED}❌ No filename provided${NC}"
        return 1
    fi
    
    # Find the backup in any directory
    found=false
    for backup_type in daily weekly monthly; do
        if rclone lsf "$GDRIVE_BASE/$backup_type/$backup_file" > /dev/null 2>&1; then
            echo "📥 Downloading $backup_file from $backup_type backups..."
            
            if rclone copy "$GDRIVE_BASE/$backup_type/$backup_file" "$LOCAL_BACKUP_DIR/" --progress; then
                echo -e "${GREEN}✅ Download completed${NC}"
                echo "   File saved to: $LOCAL_BACKUP_DIR/$backup_file"
                
                # Show restore command
                echo ""
                echo -e "${YELLOW}To restore this backup:${NC}"
                echo "   PGPASSWORD=adrdsouza pg_restore --clean --no-acl --no-owner -d vendure_db $LOCAL_BACKUP_DIR/$backup_file"
            else
                echo -e "${RED}❌ Download failed${NC}"
            fi
            found=true
            break
        fi
    done
    
    if [ "$found" = false ]; then
        echo -e "${RED}❌ Backup file not found${NC}"
    fi
}

# Function to run manual backup
run_backup() {
    echo -e "${BLUE}🚀 MANUAL BACKUP${NC}"
    echo "==============="
    echo ""
    
    echo "Select backup type:"
    echo "1) Daily backup"
    echo "2) Weekly backup"
    echo "3) Monthly backup"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1) backup_type="daily" ;;
        2) backup_type="weekly" ;;
        3) backup_type="monthly" ;;
        *) echo -e "${RED}❌ Invalid choice${NC}"; return 1 ;;
    esac
    
    echo ""
    echo "🚀 Running $backup_type backup..."
    
    if ./database/backup-to-gdrive.sh "$backup_type"; then
        echo -e "${GREEN}✅ Backup completed successfully${NC}"
    else
        echo -e "${RED}❌ Backup failed${NC}"
        echo "Check the log file: $LOG_FILE"
    fi
}

# Function to clean up old backups
cleanup_backups() {
    echo -e "${BLUE}🧹 CLEANUP OLD BACKUPS${NC}"
    echo "======================"
    echo ""
    
    echo "This will remove old backups according to retention policy:"
    echo "- Daily: Keep 30 days"
    echo "- Weekly: Keep 12 weeks"
    echo "- Monthly: Keep 12 months"
    echo ""
    
    read -p "Continue with cleanup? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for backup_type in daily weekly monthly; do
            echo "🧹 Cleaning up $backup_type backups..."
            
            case $backup_type in
                daily) cutoff_date=$(date -d '30 days ago' +%Y%m%d) ;;
                weekly) cutoff_date=$(date -d '12 weeks ago' +%Y%m%d) ;;
                monthly) cutoff_date=$(date -d '12 months ago' +%Y%m%d) ;;
            esac
            
            rclone lsf "$GDRIVE_BASE/$backup_type/" | while read -r file; do
                if [[ $file =~ vendure_${backup_type}_([0-9]{8})_ ]]; then
                    file_date=${BASH_REMATCH[1]}
                    if [ "$file_date" -lt "$cutoff_date" ]; then
                        echo "   🗑️  Deleting: $file"
                        rclone delete "$GDRIVE_BASE/$backup_type/$file"
                    fi
                fi
            done
        done
        
        echo -e "${GREEN}✅ Cleanup completed${NC}"
    else
        echo "❌ Cleanup cancelled"
    fi
}

# Function to show help
show_help() {
    echo -e "${BLUE}📖 HELP${NC}"
    echo "======="
    echo ""
    echo "Available commands:"
    echo "  list      - List all backups"
    echo "  status    - Show backup status and recent activity"
    echo "  download  - Download a backup from Google Drive"
    echo "  backup    - Run a manual backup"
    echo "  cleanup   - Clean up old backups"
    echo "  logs      - Show recent log entries"
    echo "  help      - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./database/manage-gdrive-backups.sh status"
    echo "  ./database/manage-gdrive-backups.sh list"
    echo "  ./database/manage-gdrive-backups.sh backup"
}

# Function to show logs
show_logs() {
    echo -e "${BLUE}📋 RECENT LOGS${NC}"
    echo "=============="
    echo ""
    
    if [ -f "$LOG_FILE" ]; then
        tail -20 "$LOG_FILE"
    else
        echo "📭 No log file found at: $LOG_FILE"
    fi
}

# Main menu
main_menu() {
    while true; do
        print_header
        echo "Select an option:"
        echo "1) Show backup status"
        echo "2) List all backups"
        echo "3) Download a backup"
        echo "4) Run manual backup"
        echo "5) Clean up old backups"
        echo "6) Show recent logs"
        echo "7) Help"
        echo "8) Exit"
        echo ""
        read -p "Enter choice (1-8): " choice
        
        case $choice in
            1) show_status ;;
            2) list_backups ;;
            3) download_backup ;;
            4) run_backup ;;
            5) cleanup_backups ;;
            6) show_logs ;;
            7) show_help ;;
            8) echo "👋 Goodbye!"; exit 0 ;;
            *) echo -e "${RED}❌ Invalid choice${NC}" ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Main execution
main() {
    check_rclone
    
    # Handle command line arguments
    case ${1:-menu} in
        list) list_backups ;;
        status) show_status ;;
        download) download_backup ;;
        backup) run_backup ;;
        cleanup) cleanup_backups ;;
        logs) show_logs ;;
        help) show_help ;;
        menu) main_menu ;;
        *) echo -e "${RED}❌ Unknown command: $1${NC}"; show_help ;;
    esac
}

# Run main function
main "$@"
