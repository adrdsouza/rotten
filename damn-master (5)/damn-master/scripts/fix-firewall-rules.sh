#!/bin/bash
# Fix UFW rules to allow Docker networks while blocking external access
# This script deletes existing rules and re-adds them in the correct order

echo "🔧 Fixing UFW firewall rules..."

# First, delete all rules for ports 3000, 4000, 5173, 5432
echo "🗑️  Removing existing rules for application ports..."

# Keep trying to delete rules until there are no more (UFW doesn't have a "delete all" command)
while sudo ufw status numbered | grep -E " (3000|4000|5173|5432)" > /dev/null; do
    # Get the first rule number for these ports and delete it
    RULE_NUM=$(sudo ufw status numbered | grep -E " (3000|4000|5173|5432)" | head -1 | awk -F'[][]' '{print $2}')
    if [ -n "$RULE_NUM" ]; then
        echo "   - Deleting rule #$RULE_NUM"
        echo "y" | sudo ufw delete $RULE_NUM
    else
        break
    fi
done

echo ""
echo "✅ Adding rules in correct order..."

# Step 1: Allow Docker bridge networks FIRST (these must come before deny rules)
echo "📋 Step 1: Allow Docker networks..."
sudo ufw insert 1 allow from 172.17.0.0/16 to any port 3000 proto tcp comment 'Docker bridge to Vendure API'
sudo ufw insert 2 allow from 172.17.0.0/16 to any port 4000 proto tcp comment 'Docker bridge to Frontend'
sudo ufw insert 3 allow from 172.17.0.0/16 to any port 5173 proto tcp comment 'Docker bridge to Dashboard'

sudo ufw insert 4 allow from 172.22.0.0/16 to any port 3000 proto tcp comment 'nginx-brotli to Vendure API'
sudo ufw insert 5 allow from 172.22.0.0/16 to any port 4000 proto tcp comment 'nginx-brotli to Frontend'
sudo ufw insert 6 allow from 172.22.0.0/16 to any port 5173 proto tcp comment 'nginx-brotli to Dashboard'

# Step 2: Allow localhost
echo "📋 Step 2: Allow localhost..."
sudo ufw insert 7 allow from 127.0.0.1 to any port 3000 proto tcp comment 'localhost to Vendure API'
sudo ufw insert 8 allow from 127.0.0.1 to any port 4000 proto tcp comment 'localhost to Frontend'
sudo ufw insert 9 allow from 127.0.0.1 to any port 5173 proto tcp comment 'localhost to Dashboard'

# Step 3: Deny everything else (these rules will be evaluated last)
echo "📋 Step 3: Deny external access..."
sudo ufw deny from any to any port 3000 proto tcp comment 'Block external Vendure API'
sudo ufw deny from any to any port 4000 proto tcp comment 'Block external Frontend'
sudo ufw deny from any to any port 5173 proto tcp comment 'Block external Dashboard'
sudo ufw deny from any to any port 5432 proto tcp comment 'Block external PostgreSQL'

# Reload firewall
echo ""
echo "🔄 Reloading firewall..."
sudo ufw reload

# Show status
echo ""
echo "✅ Firewall rules fixed!"
echo ""
echo "📊 Current firewall status:"
sudo ufw status numbered | grep -E "(3000|4000|5173|5432)"

echo ""
echo "🔍 Verification:"
echo "  - Docker networks (172.17.0.0/16, 172.22.0.0/16) should be ALLOWED"
echo "  - Localhost (127.0.0.1) should be ALLOWED"
echo "  - Everything else should be DENIED"
