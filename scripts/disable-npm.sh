#!/bin/bash

# Disable npm commands by aliasing them to the block script
# pnpm remains available as this project uses pnpm

# Write status file so .bashrc picks it up on next shell
echo "disabled" > /home/vendure/rottenhand/bin/.npm_status

# Also set alias for current shell
alias npm='/home/vendure/rottenhand/scripts/block-npm.sh'

echo "✅ npm commands are now blocked."
echo "💡 This project uses pnpm - npm is blocked to prevent confusion."
echo "📦 Use pnpm commands normally (pnpm install, pnpm build, pnpm dev, etc.)"
echo "🔧 To temporarily re-enable npm, run: source ./scripts/enable-npm.sh"
echo "📝 Note: Alias affects current shell. Status file affects all new shells."