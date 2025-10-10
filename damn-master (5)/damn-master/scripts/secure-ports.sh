#!/bin/bash
# PCI Compliance: Block direct access to application ports
# Only nginx (via localhost/private network) should access these ports

echo "🔒 Securing application ports for PCI compliance..."

# Check if UFW is installed
if ! command -v ufw &> /dev/null; then
    echo "❌ UFW not installed. Installing..."
    apt-get update && apt-get install -y ufw
fi

# Enable UFW if not already enabled
if ! ufw status | grep -q "Status: active"; then
    echo "📋 Enabling UFW firewall..."
    ufw --force enable
fi

# Allow SSH (port 22) - CRITICAL: Don't lock yourself out!
echo "✅ Allowing SSH (port 22)..."
ufw allow 22/tcp

# Allow HTTP and HTTPS (nginx ports)
echo "✅ Allowing HTTP (80) and HTTPS (443)..."
ufw allow 80/tcp
ufw allow 443/tcp

# Allow Docker networks to access application ports
echo "✅ Allowing Docker bridge networks to access application ports..."

# Allow Docker bridge network (172.17.0.0/16)
ufw allow from 172.17.0.0/16 to any port 3000 proto tcp
ufw allow from 172.17.0.0/16 to any port 4000 proto tcp
ufw allow from 172.17.0.0/16 to any port 5173 proto tcp
echo "   - Allowed Docker bridge (172.17.0.0/16)"

# Allow nginx-brotli network (172.22.0.0/16)
ufw allow from 172.22.0.0/16 to any port 3000 proto tcp
ufw allow from 172.22.0.0/16 to any port 4000 proto tcp
ufw allow from 172.22.0.0/16 to any port 5173 proto tcp
echo "   - Allowed nginx-brotli network (172.22.0.0/16)"

# Allow localhost access (127.0.0.1 and ::1)
ufw allow from 127.0.0.1 to any port 3000 proto tcp
ufw allow from 127.0.0.1 to any port 4000 proto tcp
ufw allow from 127.0.0.1 to any port 5173 proto tcp
echo "   - Allowed localhost (127.0.0.1)"

# Block direct access to application ports from external networks
echo "🚫 Blocking direct external access to application ports..."

# Block port 3000 (Vendure API) - only accessible via nginx/localhost/docker
ufw deny from any to any port 3000 proto tcp
echo "   - Blocked external access to port 3000 (Vendure API)"

# Block port 4000 (Frontend) - only accessible via nginx/localhost/docker
ufw deny from any to any port 4000 proto tcp
echo "   - Blocked external access to port 4000 (Frontend)"

# Block port 5173 (Dashboard) - only accessible via nginx/localhost/docker
ufw deny from any to any port 5173 proto tcp
echo "   - Blocked external access to port 5173 (Dashboard)"

# Block port 5432 (PostgreSQL) - already localhost-only but add firewall rule
ufw deny from any to any port 5432 proto tcp
echo "   - Blocked external access to port 5432 (PostgreSQL)"

# Reload firewall
echo "🔄 Reloading firewall..."
ufw reload

# Show status
echo ""
echo "✅ Firewall configuration complete!"
echo ""
echo "📊 Current firewall status:"
ufw status numbered

echo ""
echo "🔍 Verification commands:"
echo "  - Test dashboard via nginx: curl -I https://damneddesigns.com/admin"
echo "  - Test direct access (should fail): curl -I http://5.78.142.235:5173/admin"
echo ""
echo "⚠️  IMPORTANT: Nginx can still access these ports because it connects from the same server"
echo "   External attackers cannot bypass nginx security filters anymore."
