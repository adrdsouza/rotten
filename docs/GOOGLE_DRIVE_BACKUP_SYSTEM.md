# Google Drive Backup System

## Overview

Automated database backup system that creates daily, weekly, and monthly backups and uploads them to Google Drive for secure off-site storage.

## 🚀 Quick Setup

### Step 1: Run Setup Script
```bash
cd /home/vendure/rottenhand
./database/setup-google-drive-backup.sh
```

This will:
- Install rclone (Google Drive sync tool)
- Configure Google Drive authentication
- Create backup directories on Google Drive
- Set up automated backup scripts
- Schedule cron jobs for automatic backups

### Step 2: Follow Interactive Setup
The script will guide you through:
1. Google Drive authentication (opens browser)
2. Testing the connection
3. Creating backup directory structure
4. Scheduling automatic backups

## 📅 Backup Schedule

### Automatic Backups
- **Daily**: 2:00 AM every day (keeps 30 days)
- **Weekly**: 3:00 AM every Sunday (keeps 12 weeks)  
- **Monthly**: 4:00 AM on 1st of each month (keeps 12 months)

### Retention Policy
- **Daily backups**: 30 days
- **Weekly backups**: 12 weeks (3 months)
- **Monthly backups**: 12 months (1 year)

## 📁 Google Drive Structure

```
RottenHand-Backups/
└── database/
    ├── daily/          # Daily backups (30 days)
    ├── weekly/         # Weekly backups (12 weeks)
    └── monthly/        # Monthly backups (12 months)
```

## 🛠️ Management Commands

### Backup Management Script
```bash
# Interactive menu
./database/manage-gdrive-backups.sh

# Direct commands
./database/manage-gdrive-backups.sh status    # Show backup status
./database/manage-gdrive-backups.sh list      # List all backups
./database/manage-gdrive-backups.sh backup    # Run manual backup
./database/manage-gdrive-backups.sh download  # Download a backup
./database/manage-gdrive-backups.sh cleanup   # Clean old backups
./database/manage-gdrive-backups.sh logs      # Show recent logs
```

### Manual Backup Commands
```bash
# Run specific backup types
./database/backup-to-gdrive.sh daily
./database/backup-to-gdrive.sh weekly
./database/backup-to-gdrive.sh monthly
```

### Direct rclone Commands
```bash
# List backups
rclone lsf gdrive:RottenHand-Backups/database/daily/

# Download a backup
rclone copy gdrive:RottenHand-Backups/database/daily/backup_file.dump ./

# Check Google Drive space
rclone about gdrive:
```

## 🔧 Configuration Files

### Main Backup Script
- **Location**: `database/backup-to-gdrive.sh`
- **Purpose**: Creates and uploads backups
- **Customizable**: Email notifications, retention periods

### Management Script  
- **Location**: `database/manage-gdrive-backups.sh`
- **Purpose**: Monitor and manage backups
- **Features**: Interactive menu, status monitoring

### Log Files
- **Location**: `database/logs/gdrive-backup.log`
- **Content**: Backup activity, errors, status updates

## 📊 Monitoring & Alerts

### Check Backup Status
```bash
./database/manage-gdrive-backups.sh status
```

Shows:
- Last backup times for each type
- Cron job status
- Recent activity from logs
- Days since last backup

### Log Monitoring
```bash
# View recent logs
tail -f database/logs/gdrive-backup.log

# Check for errors
grep -i error database/logs/gdrive-backup.log
```

### Email Notifications (Optional)
Edit `database/backup-to-gdrive.sh`:
```bash
EMAIL_TO="your-email@example.com"
SEND_EMAIL=true
```

## 🔄 Restore Process

### 1. Download Backup
```bash
# Interactive download
./database/manage-gdrive-backups.sh download

# Or direct download
rclone copy gdrive:RottenHand-Backups/database/daily/vendure_daily_20250722_160153.dump ./
```

### 2. Restore Database
```bash
# Full restore (replaces existing database)
PGPASSWORD=adrdsouza pg_restore \
  --clean \
  --no-acl \
  --no-owner \
  -d vendure_db \
  backup_file.dump

# Restore to different database (for testing)
PGPASSWORD=adrdsouza createdb vendure_test
PGPASSWORD=adrdsouza pg_restore \
  --clean \
  --no-acl \
  --no-owner \
  -d vendure_test \
  backup_file.dump
```

## 🔐 Security Features

### Authentication
- **OAuth2**: Secure Google Drive authentication
- **Token Storage**: Encrypted tokens stored locally
- **Scope Limitation**: Limited to specific Google Drive folder

### Backup Security
- **Compression**: All backups are compressed (saves space)
- **Encryption**: Data encrypted in transit to Google Drive
- **Access Control**: Only authenticated user can access backups

### Local Security
- **File Permissions**: Backup scripts have restricted permissions
- **Log Rotation**: Logs are automatically rotated
- **Cleanup**: Old local backups are automatically removed

## 🚨 Troubleshooting

### Common Issues

#### "rclone not found"
```bash
# Reinstall rclone
curl https://rclone.org/install.sh | sudo bash
```

#### "Google Drive not configured"
```bash
# Reconfigure Google Drive
rclone config
```

#### "Upload failed"
```bash
# Check Google Drive space
rclone about gdrive:

# Test connection
rclone lsd gdrive:

# Check logs
tail -20 database/logs/gdrive-backup.log
```

#### "Cron jobs not running"
```bash
# Check cron service
sudo systemctl status cron

# View cron jobs
crontab -l

# Check cron logs
sudo tail -20 /var/log/cron
```

### Recovery Scenarios

#### Complete System Failure
1. Install fresh system
2. Install rclone and configure Google Drive
3. Download latest backup from Google Drive
4. Restore database
5. Restore application files

#### Partial Data Loss
1. Identify what data was lost
2. Download appropriate backup (daily/weekly/monthly)
3. Restore to test database
4. Extract needed data
5. Import to production database

#### Corrupted Database
1. Stop Vendure application
2. Download latest known good backup
3. Restore database
4. Restart application
5. Verify data integrity

## 📈 Backup Statistics

### Storage Usage
- **Daily backups**: ~7.4MB each × 30 = ~222MB
- **Weekly backups**: ~7.4MB each × 12 = ~89MB
- **Monthly backups**: ~7.4MB each × 12 = ~89MB
- **Total Google Drive usage**: ~400MB

### Performance
- **Backup creation**: 2-5 minutes
- **Upload time**: 1-3 minutes (depends on connection)
- **Total backup time**: 3-8 minutes
- **Download time**: 30 seconds - 2 minutes

## 🔄 Maintenance Tasks

### Weekly
- Check backup status: `./database/manage-gdrive-backups.sh status`
- Review logs for errors: `grep -i error database/logs/gdrive-backup.log`

### Monthly
- Test restore process with monthly backup
- Review Google Drive storage usage
- Clean up old local backup files

### Quarterly
- Test complete disaster recovery process
- Review and update retention policies
- Update documentation if needed

## 🎯 Best Practices

### Backup Strategy
- **3-2-1 Rule**: 3 copies, 2 different media, 1 offsite (Google Drive)
- **Regular Testing**: Test restore process monthly
- **Multiple Retention**: Daily, weekly, monthly for different recovery needs

### Security
- **Regular Token Refresh**: rclone handles this automatically
- **Monitor Access**: Check Google Drive activity regularly
- **Secure Credentials**: Never commit passwords to version control

### Performance
- **Off-Peak Scheduling**: Backups run at night (low traffic)
- **Compression**: All backups are compressed to save space/time
- **Incremental Cleanup**: Old backups removed automatically

## ✅ Success Indicators

Your backup system is working correctly when:
- ✅ Daily backups appear in Google Drive every day
- ✅ Weekly backups appear every Sunday
- ✅ Monthly backups appear on 1st of each month
- ✅ Old backups are automatically cleaned up
- ✅ Log file shows successful operations
- ✅ Test restores work correctly

## 📞 Support

### Log Files
- **Backup logs**: `database/logs/gdrive-backup.log`
- **Cron logs**: `/var/log/cron`
- **System logs**: `journalctl -u cron`

### Useful Commands
```bash
# Check rclone version
rclone version

# Test Google Drive connection
rclone lsd gdrive:

# Check available space
rclone about gdrive:

# Manual backup test
./database/backup-to-gdrive.sh daily
```

This system provides enterprise-grade backup reliability with automated scheduling, retention management, and easy recovery options.
