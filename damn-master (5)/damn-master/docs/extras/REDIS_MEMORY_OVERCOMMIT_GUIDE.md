# Redis Memory Overcommit Configuration Guide

## Overview
This guide configures Linux kernel memory overcommit settings to prevent Redis from failing under memory pressure. Redis requires proper memory overcommit settings to operate reliably in production environments.

## Current Status
- **Current setting**: `vm.overcommit_memory = 0` (heuristic overcommit)
- **Recommended setting**: `vm.overcommit_memory = 1` (always overcommit)

## Memory Overcommit Modes
- **0** = Heuristic overcommit (default, can cause Redis issues)
- **1** = Always overcommit (recommended for Redis)
- **2** = Don't overcommit (strict accounting)

## Manual Configuration Steps

### Step 1: Check Current Settings
```bash
# Check current overcommit settings
cat /proc/sys/vm/overcommit_memory
cat /proc/sys/vm/overcommit_ratio
```

### Step 2: Apply Temporary Fix (Immediate Effect)
```bash
# Set temporary overcommit setting
sudo sysctl vm.overcommit_memory=1

# Verify the change
cat /proc/sys/vm/overcommit_memory
```

### Step 3: Make Changes Persistent
```bash
# Backup existing sysctl.conf
sudo cp /etc/sysctl.conf /etc/sysctl.conf.backup.$(date +%Y%m%d_%H%M%S)

# Remove any existing overcommit_memory settings
sudo sed -i '/^vm\.overcommit_memory/d' /etc/sysctl.conf

# Add the new setting
echo "vm.overcommit_memory = 1" | sudo tee -a /etc/sysctl.conf
```

### Step 4: Verify Configuration
```bash
# Check the setting is applied
cat /proc/sys/vm/overcommit_memory

# Test Redis connectivity
docker exec redis-server redis-cli ping
```

## Automated Script
You can also run the automated script:
```bash
chmod +x redis-memory-overcommit-fix.sh
sudo ./redis-memory-overcommit-fix.sh
```

## What This Fix Does
- Prevents Redis from failing with 'Cannot allocate memory' errors
- Allows Redis to use memory more efficiently under pressure
- Eliminates Redis warnings about memory overcommit
- Setting persists across system reboots

## Verification
After applying the fix:
1. Redis should no longer show memory overcommit warnings in logs
2. Redis performance under memory pressure should improve
3. System should handle memory allocation more gracefully

## Rollback (if needed)
To revert to the original setting:
```bash
sudo sysctl vm.overcommit_memory=0
sudo sed -i '/^vm\.overcommit_memory/d' /etc/sysctl.conf
```
