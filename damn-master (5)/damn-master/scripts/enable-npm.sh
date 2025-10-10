#!/bin/bash

# Enable NPM Script
# This script temporarily re-enables npm commands
# Note: pnpm was never blocked and remains available

echo "✅ Enabling npm commands..."

# Remove the alias that blocks npm
unalias npm 2>/dev/null

echo "✅ npm commands are now temporarily enabled."
echo "💡 Remember: This project uses pnpm, not npm."
echo "📦 For normal development, use pnpm commands (pnpm build, pnpm dev, etc.)"
echo "🔧 To disable npm again, run: source ./disable-npm.sh"
echo "⚠️  Note: This only affects the current shell session."