#!/bin/bash

# Disable npm commands by aliasing them to the block script
# pnpm remains available as this project uses pnpm
alias npm='/home/vendure/damneddesigns/block-npm.sh'

echo "✅ npm commands are now blocked."
echo "💡 This project uses pnpm - npm is blocked to prevent confusion."
echo "📦 Use pnpm commands normally (pnpm install, pnpm build, pnpm dev, etc.)"
echo "🔧 To temporarily re-enable npm, run: source ./enable-npm.sh"
echo "📝 Note: This alias only affects the current shell session."