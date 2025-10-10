# rclone Setup Guide for Google Drive Backups

## Step 1: Install rclone

Run this command to install rclone:

```bash
sudo -v && curl https://rclone.org/install.sh | sudo bash
```

Verify installation:
```bash
rclone version
```

## Step 2: Configure Google Drive

Run the configuration wizard:
```bash
rclone config
```

Follow these steps exactly:

### Configuration Steps:

1. **New remote**: Type `n` and press Enter
2. **Name**: Type `gdrive` and press Enter
3. **Storage type**: Look for "Google Drive" (usually option 15 or 22) and enter that number
4. **Client ID**: Press Enter (leave blank)
5. **Client Secret**: Press Enter (leave blank)
6. **Scope**: Type `1` for full access and press Enter
7. **Root folder ID**: Press Enter (leave blank)
8. **Service account file**: Press Enter (leave blank)
9. **Advanced config**: Type `n` and press Enter
10. **Auto config**: Type `y` and press Enter

### Browser Authorization:

- A browser window will open
- Sign in to your Google account
- Click "Allow" to grant permissions
- You'll see "Success!" message
- Return to terminal

### Finish Configuration:

11. **Confirm**: Type `y` and press Enter
12. **Quit**: Type `q` and press Enter

## Step 3: Test Connection

Test that Google Drive is working:
```bash
rclone lsd gdrive:
```

You should see your Google Drive folders listed.

## Step 4: Set Up Incremental Backups

Once rclone is configured, run:
```bash
cd /home/vendure/damneddesigns
./database/setup-incremental-backups.sh
```

This will:
- Create Google Drive backup directories
- Set up weekly full backup script
- Set up 6-hourly incremental backup script
- Schedule automatic backups via cron
- Create management tools

## Backup Schedule

### Automatic Schedule:
- **Full backup**: Every Sunday at 2:00 AM
- **Incremental backups**: Every 6 hours (6 AM, 12 PM, 6 PM, 12 AM)

### Retention Policy:
- **Full backups**: Keep 8 weeks (2 months)
- **Incremental backups**: Keep 7 days

## Management Commands

After setup, use these commands:

```bash
# Check backup status
./database/manage-incremental-backups.sh status

# Run manual full backup
./database/manage-incremental-backups.sh full

# Run manual incremental backup
./database/manage-incremental-backups.sh incremental

# View recent logs
./database/manage-incremental-backups.sh logs

# Get restore instructions
./database/manage-incremental-backups.sh restore
```

## Google Drive Structure

Your backups will be organized as:
```
Google Drive/
└── DamnedDesigns-Backups/
    └── database/
        ├── full/          # Weekly full backups (~7MB each)
        └── incremental/   # 6-hourly incremental backups (~1-3MB each)
```

## Storage Usage Estimate

- **Full backups**: ~7MB × 8 weeks = ~56MB
- **Incremental backups**: ~2MB × 28 (7 days × 4 per day) = ~56MB
- **Total Google Drive usage**: ~112MB

## Troubleshooting

### "rclone: command not found"
```bash
# Reinstall rclone
sudo -v && curl https://rclone.org/install.sh | sudo bash
```

### "Failed to configure token"
```bash
# Reconfigure Google Drive
rclone config
# Delete existing 'gdrive' remote and create new one
```

### "Upload failed"
```bash
# Check Google Drive connection
rclone lsd gdrive:

# Check available space
rclone about gdrive:
```

### "Cron jobs not running"
```bash
# Check cron service
sudo systemctl status cron

# View scheduled jobs
crontab -l

# Check cron logs
sudo tail -20 /var/log/cron
```

## Security Notes

- rclone stores encrypted tokens locally
- Only your Google account can access the backups
- Backups are compressed and uploaded securely
- Local backup files are automatically cleaned up

## Next Steps

After successful setup:

1. **Test the system**: Run a manual incremental backup
2. **Monitor logs**: Check backup logs regularly
3. **Verify uploads**: Confirm backups appear in Google Drive
4. **Test restore**: Practice restoring from a backup (to test database)

Your database will now be automatically backed up with enterprise-grade reliability!
