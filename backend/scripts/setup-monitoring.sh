#!/bin/bash

# Setup Comprehensive Monitoring for Vendure Backend
# This script sets up automated health monitoring

echo "🔧 Setting up comprehensive monitoring..."

# Create monitoring directory
mkdir -p /home/vendure/rottenhand/logs/monitoring
mkdir -p /home/vendure/rottenhand/logs/pm2

# Make health monitor executable
chmod +x /home/vendure/rottenhand/backend/scripts/health-monitor.js

# Add cron job for health monitoring (every 5 minutes)
CRON_JOB="*/5 * * * * cd /home/vendure/rottenhand/backend && node scripts/health-monitor.js >> /home/vendure/rottenhand/logs/monitoring/monitoring-cron.log 2>&1"

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "health-monitor.js"; then
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Health monitoring cron job added (runs every 5 minutes)"
else
    echo "ℹ️  Health monitoring cron job already exists"
fi

# Create log rotation script
cat > /home/vendure/rottenhand/backend/scripts/rotate-logs.sh << 'EOF'
#!/bin/bash
# Log rotation script for monitoring logs

LOG_DIR="/home/vendure/rottenhand/logs/monitoring"
PM2_LOG_DIR="/home/vendure/rottenhand/logs/pm2"
MAX_SIZE="10M"
BACKUP_COUNT=5

# Rotate health monitor logs
if [ -f "$LOG_DIR/health-monitor.log" ]; then
    if [ $(stat -c%s "$LOG_DIR/health-monitor.log") -gt $(numfmt --from=iec $MAX_SIZE) ]; then
        # Rotate logs
        for i in $(seq $((BACKUP_COUNT-1)) -1 1); do
            if [ -f "$LOG_DIR/health-monitor.log.$i" ]; then
                mv "$LOG_DIR/health-monitor.log.$i" "$LOG_DIR/health-monitor.log.$((i+1))"
            fi
        done
        mv "$LOG_DIR/health-monitor.log" "$LOG_DIR/health-monitor.log.1"
        touch "$LOG_DIR/health-monitor.log"
        echo "$(date): Rotated health-monitor.log" >> "$LOG_DIR/rotation.log"
    fi
fi

# Rotate PM2 logs
for log_file in pm2-backend.log pm2-worker.log pm2-backend-out.log pm2-worker-out.log pm2-backend-error.log pm2-worker-error.log; do
    if [ -f "$PM2_LOG_DIR/$log_file" ]; then
        if [ $(stat -c%s "$PM2_LOG_DIR/$log_file") -gt $(numfmt --from=iec $MAX_SIZE) ]; then
            for i in $(seq $((BACKUP_COUNT-1)) -1 1); do
                if [ -f "$PM2_LOG_DIR/$log_file.$i" ]; then
                    mv "$PM2_LOG_DIR/$log_file.$i" "$PM2_LOG_DIR/$log_file.$((i+1))"
                fi
            done
            mv "$PM2_LOG_DIR/$log_file" "$PM2_LOG_DIR/$log_file.1"
            touch "$PM2_LOG_DIR/$log_file"
            echo "$(date): Rotated $log_file" >> "$LOG_DIR/rotation.log"
        fi
    fi
done
EOF

chmod +x /home/vendure/rottenhand/backend/scripts/rotate-logs.sh

# Add log rotation cron job (daily at 2 AM)
LOG_ROTATION_CRON="0 2 * * * /home/vendure/rottenhand/backend/scripts/rotate-logs.sh"

if ! crontab -l 2>/dev/null | grep -q "rotate-logs.sh"; then
    (crontab -l 2>/dev/null; echo "$LOG_ROTATION_CRON") | crontab -
    echo "✅ Log rotation cron job added (runs daily at 2 AM)"
else
    echo "ℹ️  Log rotation cron job already exists"
fi

echo ""
echo "🎯 Monitoring Setup Complete!"
echo ""
echo "📊 Active Monitoring:"
echo "   - Health checks every 5 minutes"
echo "   - Log rotation daily at 2 AM"
echo "   - PM2 cluster mode with enhanced logging"
echo "   - Asset server security with preset restrictions"
echo ""
echo "📁 Log Locations:"
echo "   - Health monitoring: /home/vendure/rottenhand/logs/monitoring/health-monitor.log"
echo "   - PM2 backend: /home/vendure/rottenhand/logs/pm2/pm2-backend.log"
echo "   - PM2 worker: /home/vendure/rottenhand/logs/pm2/pm2-worker.log"
echo "   - Rotation log: /home/vendure/rottenhand/logs/monitoring/rotation.log"
echo ""
echo "🔍 Manual Commands:"
echo "   - Check health: node scripts/health-monitor.js"
echo "   - View PM2 status: pm2 status"
echo "   - View PM2 monitoring: pm2 monit"
echo "   - Rotate logs manually: scripts/rotate-logs.sh"
echo ""
echo "✅ Phase 3 Infrastructure Improvements Complete!"