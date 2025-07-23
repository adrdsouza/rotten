#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p /home/vendure/rottenhand/backend/logs

# Set appropriate permissions (adjust user:group as needed)
chown -R vendure:vendure /home/vendure/rottenhand/backend/logs
chmod 750 /home/vendure/rottenhand/backend/logs

# Create logrotate configuration
cat > /etc/logrotate.d/vendure-logs << 'EOL'
/home/vendure/rottenhand/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 vendure vendure
    sharedscripts
    postrotate
        # Send USR1 signal to Node.js process to reopen log files
        [ -f /home/vendure/rottenhand/backend/pids/app.pid ] && kill -USR1 $(cat /home/vendure/rottenhand/backend/pids/app.pid) || true
    endscript
}
EOL

echo "Logging setup complete. Logs will be stored in /home/vendure/rottenhand/backend/logs/"
echo "Log rotation has been configured in /etc/logrotate.d/vendure-logs"
