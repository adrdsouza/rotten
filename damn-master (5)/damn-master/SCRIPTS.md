# Scripts Directory

All maintenance, NPM management, and utility scripts have been moved to the `scripts/` directory to keep the root clean.

## Quick Access

- **View all scripts:** `ls scripts/`
- **Quick commands reference:** `scripts/COMMANDS.md`
- **Detailed documentation:** `scripts/README.md`

## Most Common Commands

```bash
# Enable maintenance mode
./scripts/maint-on.sh

# Disable maintenance mode  
./scripts/maint-off.sh

# Check maintenance status
pm2 show store
```

See `scripts/COMMANDS.md` for the complete reference.
