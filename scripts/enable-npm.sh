#!/bin/bash

# Enable NPM Script
# This script temporarily re-enables npm commands
# Note: pnpm was never blocked and remains available

echo "✅ Enabling npm commands..."

# Write status file so .bashrc doesn't block npm in new shells
echo "enabled" > /home/vendure/rottenhand/bin/.npm_status

# Remove the alias that blocks npm in current shell
unalias npm 2>/dev/null

echo "✅ npm commands are now enabled."
echo "💡 Remember: This project uses pnpm, not npm."
echo "📦 For normal development, use pnpm commands (pnpm build, pnpm dev, etc.)"
echo "🔧 To disable npm again, run: source ./scripts/disable-npm.sh"
echo "📝 Note: Alias affects current shell. Status file affects all new shells."