# Quick Commands Reference

## NPM Control

### Enable NPM
```bash
./scripts/enable-npm.sh
```

### Disable NPM (Block NPM)
```bash
./scripts/disable-npm.sh
```

### Block NPM (Alternative)
```bash
./scripts/block-npm.sh
```

## Maintenance Mode

### Enable Maintenance Mode
```bash
./scripts/maint-on.sh
```

### Disable Maintenance Mode
```bash
./scripts/maint-off.sh
```

### Check Maintenance Status
```bash
pm2 show store
```

### Check PM2 Process List
```bash
pm2 list
```

## Application Management

### Start Vendure Application
```bash
./scripts/start-vendure.sh
```

### Restart Backend and Frontend
```bash
# Backend
pnpm build && pm2 restart admin worker

# Frontend
pnpm build && pm2 restart store
```

## Notes

- All scripts should be run from the root directory (`/home/vendure/damneddesigns/`)
- Maintenance mode switches the PM2 process to serve a maintenance page
- NPM control scripts manage whether npm commands are allowed to run
- Make sure scripts are executable before running (they should already be set up correctly)
- The maintenance server runs persistently - no need to keep terminal open
- Use `pm2 show store` to check if maintenance mode is active (script path will show maintenance server vs normal frontend)