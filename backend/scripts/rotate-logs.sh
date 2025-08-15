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
