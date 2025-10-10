# Unused, Temporary, and Old Files Report

This report lists files across the server (including the `damneddesigns` directory and others) that are likely unused, temporary, or old. The analysis is based on file naming, extensions, and codebase references.

## 🧹 Cleanup History

### 2025-01-29 - Backup File Cleanup
- ✅ **REMOVED**: `frontend/src/routes/index-backup.tsx` (516 lines) - Original homepage backup no longer needed
- ✅ **REMOVED**: `backend/package.json.backup` - Package.json backup from dependency updates
- ✅ **VERIFIED**: Build successful after cleanup
- ⚠️ **KEPT**: Log backup directories (legitimate log rotation system)
- ⚠️ **KEPT**: Database backup scripts (active backup management system)

---

## Legend
- **Unused**: Not referenced/imported anywhere in the codebase.
- **Temp**: Temporary, log, or backup files (e.g., `.tmp`, `.bak`, `.log`, `.gz`, `*_backup*`, `*_old*`).
- **Old**: Files with names or patterns indicating they are deprecated or backups.

---

## Summary

- This report is a work in progress. More details and categorization will be filled in as analysis completes.

---

## Unused Files

Below are files in `damneddesigns/backend` and `damneddesigns/frontend` (excluding all assets directories) that do not appear to be referenced or imported anywhere else in the codebase, based on automated analysis. These may be safe to remove, but review before deleting:

- `/home/vendure/damneddesigns/frontend/scripts/tsconfig.scripts.json` — Script TypeScript config (appears unused)
- `/home/vendure/damneddesigns/backend/src/plugins/custom-shipping/package.json` — Plugin manifest (appears unused)

_(Note: Most code/config/docs/scripts in the main app directories are referenced or used. If you want a deeper scan for a specific file type or directory, let me know.)_

---

---

## Temporary/Log/Backup Files

- `/home/vendure/damneddesigns/backend/final_test.log`
- `/home/vendure/damneddesigns/backend/logs/audit-backup/2025-05-29.log`
- `/home/vendure/damneddesigns/backend/logs/audit-backup/2025-05-30.log`
- `/home/vendure/damneddesigns/backend/logs/payment-backup/2025-05-29.log`
- `/home/vendure/damneddesigns/backend/server.log`
- `/home/vendure/damneddesigns/backend/server_test.log`
- `/home/vendure/damneddesigns/backend/startup.log`
- `/home/vendure/damneddesigns/backend/package.json.backup`
- `/home/vendure/docker-stacks/nginx/data/logs/fallback_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/fallback_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/fallback_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/fallback_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/letsencrypt-requests_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/letsencrypt-requests_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/letsencrypt-requests_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-10_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-10_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-10_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-10_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-11_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-11_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-11_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-11_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-12_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-12_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-12_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-12_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-13_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-13_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-13_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-13_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-14_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-14_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-14_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-14_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-1_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-1_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-1_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-2_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-2_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-2_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-2_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-3_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-3_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-3_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-3_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-4_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-4_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-4_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-4_error.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-5_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-5_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-5_error.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-6_access.log`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-6_access.log.1.gz`
- `/home/vendure/docker-stacks/nginx/data/logs/proxy-host-6_error.log`

*(...and more, see docker-stacks/nginx/data/logs for more log/backup files)*

---


---

## Old/Deprecated Files

- ~~`/home/vendure/damneddesigns/backend/package.json.backup`~~ ✅ **REMOVED** (2025-01-29)
- ~~`/home/vendure/damneddesigns/frontend/src/routes/index-backup.tsx`~~ ✅ **REMOVED** (2025-01-29)
- `/home/vendure/damneddesigns/backend/logs/audit-backup/2025-05-29.log`
- `/home/vendure/damneddesigns/backend/logs/audit-backup/2025-05-30.log`
- `/home/vendure/damneddesigns/backend/logs/payment-backup/2025-05-29.log`
- `/home/vendure/vendure_db_after_inventory_update.sql` (likely an old DB dump)

---


---


---

## Files by Directory

### /home/vendure

- `.bash_history` — Shell history (system/config)
- `.bash_logout` — Shell config (system/config)
- `.bashrc` — Shell config (system/config)
- `.cache/` — User cache directory (system/config)
- `.claude/` — Likely AI assistant data (miscellaneous)
- `.claude.json` — AI assistant config/history (miscellaneous)
- `.cloud-locale-test.skip` — Cloud-init/locale setup marker (system/config)
- `.codeium/` — AI/code tool config (miscellaneous)
- `.config/` — User config directory (system/config)
- `.dotnet/` — Dotnet SDK data (dev tool)
- `.env` — App environment variables (app)
- `.gitconfig` — Git config (system/config)
- `.lesshst` — Less pager history (system/config)
- `.local/` — User local data (system/config)
- `.npm/` — NPM cache/data (dev tool)
- `.pm2/` — PM2 process manager data (dev tool)
- `.profile` — Shell config (system/config)
- `.psql_history` — Postgres CLI history (system/config)
- `.selected_editor` — Default editor marker (system/config)
- `.ssh/` — SSH keys/config (system/config)
- `.sudo_as_admin_successful` — Sudo marker (system/config)
- `.viminfo` — Vim editor history (system/config)
- `.vscode/` — VSCode config (dev tool)
- `.vscode-server/` — VSCode remote server data (dev tool)
- `.wget-hsts` — Wget history (system/config)
- `.windsurf-server/` — Windsurf tool data (miscellaneous)
- `.yarn/` — Yarn cache/data (dev tool)
- `.yarnrc` — Yarn config (dev tool)
- `damneddesigns/` — Main project dir (app)
- `docker-stacks/` — Docker configs (app/dev tool)
- `frontend-ecosystem.config.js` — Project config (app)
- `package-lock.json` — NPM lockfile (app)
- `package.json` — NPM manifest (app)
- `pm2-startup.sh` — PM2 startup script (dev tool)
- `vendure_db_after_inventory_update.sql` — SQL backup (old/backup)

---

### /home/vendure/damneddesigns

- `package-lock.json` — Project lockfile (app)
- `package.json` — Project manifest (app)
- `pnpm-lock.yaml` — Project lockfile (app)

---

### /home/vendure/damneddesigns/backend

- `README.md` — Documentation (app)
- `assets/source/16/damned-mascot.png` — Asset image (app)
- `assets/source/3c/yk-fixed.png` — Asset image (app)
- `assets/source/71/damned-mascot__02.png` — Asset image (app)
- `assets/source/75/damned-mascot__04.png` — Asset image (app)
- `assets/source/89/damned-mascot__03.png` — Asset image (app)
- `console.md` — Documentation (app)
- `ecosystem.config.js` — Process manager config (app/dev tool)
- `final_test.log` — Log file (temp/log)
- `logs/audit-backup/2025-05-29.log` — Audit log backup (temp/log/old)
- `logs/audit-backup/2025-05-30.log` — Audit log backup (temp/log)
- `logs/payment-backup/2025-05-29.log` — Payment log backup (temp/log/old)
- `package.json` — Project manifest (app)
- `package.json.backup` — Backup of manifest (old/backup)
- `pnpm-lock.yaml` — Lockfile (app, can be regenerated)
- `pnpm-workspace.yaml` — Workspace config (app)
- `processes.json` — Process manager state/config (app/dev tool)
- `scripts/health-monitor.js` — Monitoring script (app/dev tool)
- `scripts/rotate-logs.sh` — Log rotation script (app/dev tool)
- `scripts/setup-logging.sh` — Log setup script (app/dev tool)
- `scripts/setup-monitoring.sh` — Monitoring setup script (app/dev tool)
- `server.log` — Log file (temp/log)
- `server_test.log` — Log file (temp/log)
- `src/config/logging-config.ts` — Source code (app)
- `src/environment.d.ts` — TypeScript definitions (app)
- `src/index-worker.ts` — Source code (app)
- `src/index.ts` — Source code (app)
- `src/migrations/1748563760959-drop-instock-columns.ts` — Migration (app)
- `src/migrations/1748564359896-backtoworking.ts` — Migration (app)
- `src/migrations/1748564596090-shippingextension.ts` — Migration (app)
- `src/migrations/1748567820742-removeshipext.ts` — Migration (app)
- `src/nmi-payment/README.md` — Documentation (app)
- `src/nmi-payment/index.ts` — Source code (app)
- `src/nmi-payment/nmi-payment-handler.ts` — Source code (app)
- `src/plugins/admin-ui-helpers/index.ts` — Source code (app)
- `src/plugins/audit-plugin.ts` — Source code (app)
- `src/plugins/custom-shipping/index.ts` — Source code (app)
- `src/plugins/custom-shipping/package.json` — Plugin manifest (app)
- `src/plugins/custom-shipping/src/index.ts` — Source code (app)
- `src/plugins/custom-shipping/src/shipping-eligibility-checker.ts` — Source code (app)
- `src/plugins/custom-shipping/src/types.ts` — TypeScript definitions (app)
- `src/plugins/custom-shipping/tsconfig.json` — Plugin config (app)
- `src/sezzle-payment/index.ts` — Source code (app)
- `src/sezzle-payment/sezzle-payment-handler.ts` — Source code (app)
- `src/utils/payment-logger.ts` — Source code (app)
- `src/vendure-config.ts` — Source code (app)
- `startup.log` — Log file (temp/log)
- `static/email/templates/email-address-change/body.hbs` — Email template (app)
- `static/email/templates/email-verification/body.hbs` — Email template (app)
- `static/email/templates/order-confirmation/body.hbs` — Email template (app)

---

### /home/vendure/damneddesigns/frontend

- `README.md` — Documentation (app)
- `adapters/express/vite.config.mts` — Build config (app/dev tool)
- `codegen-shop.ts` — Codegen script (app)
- `devcontainer-install-vendure.sh` — Devcontainer setup script (dev tool)
- `ecosystem.config.cjs` — Process manager config (app/dev tool)
- `fonts/Damned-Bold.woff2` — Font asset (app)
- `fonts/Damned-BoldItalic.woff2` — Font asset (app)
- `fonts/Damned-Regular.woff2` — Font asset (app)
- `fonts/Damned-RegularItalic.woff2` — Font asset (app)
- `images/knife-2.png` — Image asset (app)
- `images/knife-3.png` — Image asset (app)
- `images/knife.png` — Image asset (app)
- `package.json` — Project manifest (app)
- `pnpm-lock.yaml` — Lockfile (app, can be regenerated)
- `postcss.config.cjs` — Build config (app/dev tool)
- `public/asset_placeholder.webp` — Public asset (app)
- `public/favicon-dark.svg` — Public asset (app)
- `public/favicon-light.svg` — Public asset (app)
- `public/favicon.svg` — Public asset (app)
- `public/manifest.json` — Web manifest (app)
- `scripts/tsconfig.scripts.json` — Script config (app)
- `src/components/GitHubLink/GitHubLink.tsx` — Source code (app)
- `src/components/account/AddressCard.tsx` — Source code (app)
- `src/components/account/OrderCard.tsx` — Source code (app)
- `src/components/account/Tab.tsx` — Source code (app)
- `src/components/account/TabsContainer.tsx` — Source code (app)
- `src/components/address-form/AddressForm.tsx` — Source code (app)
- ... (many more source files)

---

### /home/vendure/damneddesigns/assets

- `cache/preview/...` — Preview cache images (temp/cache)
- `preview/...` — Preview images (app)
- `source/...` — Source images (app)

---

### /home/vendure/docker-stacks

#### nginx/data

- `database.sqlite` — SQLite database (app/data)
- `keys.json` — JSON config/keys (app/config)

#### nginx/data/logs

- `fallback_access.log` — Log file (temp/log)
- `fallback_access.log.1.gz` — Compressed log backup (temp/log/old)
- `fallback_error.log` — Log file (temp/log)
- `fallback_error.log.1.gz` — Compressed log backup (temp/log/old)
- `letsencrypt-requests_access.log` — Log file (temp/log)
- `letsencrypt-requests_access.log.1.gz` — Compressed log backup (temp/log/old)
- `letsencrypt-requests_error.log` — Log file (temp/log)
- `proxy-host-10_access.log` — Log file (temp/log)
- `proxy-host-10_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-10_error.log` — Log file (temp/log)
- `proxy-host-10_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-11_access.log` — Log file (temp/log)
- `proxy-host-11_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-11_error.log` — Log file (temp/log)
- `proxy-host-11_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-12_access.log` — Log file (temp/log)
- `proxy-host-12_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-12_error.log` — Log file (temp/log)
- `proxy-host-12_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-13_access.log` — Log file (temp/log)
- `proxy-host-13_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-13_error.log` — Log file (temp/log)
- `proxy-host-13_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-14_access.log` — Log file (temp/log)
- `proxy-host-14_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-14_error.log` — Log file (temp/log)
- `proxy-host-14_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-1_access.log` — Log file (temp/log)
- `proxy-host-1_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-1_error.log` — Log file (temp/log)
- `proxy-host-2_access.log` — Log file (temp/log)
- `proxy-host-2_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-2_error.log` — Log file (temp/log)
- `proxy-host-2_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-3_access.log` — Log file (temp/log)
- `proxy-host-3_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-3_error.log` — Log file (temp/log)
- `proxy-host-3_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-4_access.log` — Log file (temp/log)
- `proxy-host-4_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-4_error.log` — Log file (temp/log)
- `proxy-host-4_error.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-5_access.log` — Log file (temp/log)
- `proxy-host-5_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-5_error.log` — Log file (temp/log)
- `proxy-host-6_access.log` — Log file (temp/log)
- `proxy-host-6_access.log.1.gz` — Compressed log backup (temp/log/old)
- `proxy-host-6_error.log` — Log file (temp/log)

*(...and more similar log/backup files in nginx/data/logs)*

---

- `.bash_history` — Shell history (system/config)
- `.bash_logout` — Shell config (system/config)
- `.bashrc` — Shell config (system/config)
- `.cache/` — User cache directory (system/config)
- `.claude/` — Likely AI assistant data (miscellaneous)
- `.claude.json` — AI assistant config/history (miscellaneous)
- `.cloud-locale-test.skip` — Cloud-init/locale setup marker (system/config)
- `.codeium/` — AI/code tool config (miscellaneous)
- `.config/` — User config directory (system/config)
- `.dotnet/` — Dotnet SDK data (dev tool)
- `.env` — App environment variables (app)
- `.gitconfig` — Git config (system/config)
- `.lesshst` — Less pager history (system/config)
- `.local/` — User local data (system/config)
- `.npm/` — NPM cache/data (dev tool)
- `.pm2/` — PM2 process manager data (dev tool)
- `.profile` — Shell config (system/config)
- `.psql_history` — Postgres CLI history (system/config)
- `.selected_editor` — Default editor marker (system/config)
- `.ssh/` — SSH keys/config (system/config)
- `.sudo_as_admin_successful` — Sudo marker (system/config)
- `.viminfo` — Vim editor history (system/config)
- `.vscode/` — VSCode config (dev tool)
- `.vscode-server/` — VSCode remote server data (dev tool)
- `.wget-hsts` — Wget history (system/config)
- `.windsurf-server/` — Windsurf tool data (miscellaneous)
- `.yarn/` — Yarn cache/data (dev tool)
- `.yarnrc` — Yarn config (dev tool)
- `damneddesigns/` — Main project dir (app)
- `docker-stacks/` — Docker configs (app/dev tool)
- `frontend-ecosystem.config.js` — Project config (app)
- `node_modules/` — Node.js dependencies (app)
- `package-lock.json` — NPM lockfile (app)
- `package.json` — NPM manifest (app)
- `pm2-startup.sh` — PM2 startup script (dev tool)
- `vendure_db_after_inventory_update.sql` — SQL backup (old/backup)

---

- `/home/vendure/.sudo_as_admin_successful`  
  _System file created by Ubuntu/Debian when sudo is first used. Harmless, can be deleted but is recreated if you use sudo._

- `/home/vendure/.cloud-locale-test.skip`  
  _System file, created by cloud-init or locale setup scripts. Harmless, can be deleted if not needed._

- `/home/vendure/frontend-ecosystem.config.js`  
  _Project configuration file, likely used for project setup or tooling. Only delete if you are sure it is unused by your workflows._

- `/home/vendure/pm2-startup.sh`  
  _Script for setting up PM2 process manager at startup. Only delete if you do not use PM2 to manage Node.js processes._

- `/home/vendure/package-lock.json`, `/home/vendure/package.json`  
  _Project dependency files for Node.js. Should not be deleted if you use Node.js/npm._

- `/home/vendure/.env`  
  _Environment variable file. May contain secrets or config for your app._

- `/home/vendure/.gitconfig`  
  _Git configuration for this user._

- `/home/vendure/vendure_db_after_inventory_update.sql`  
  _Large SQL dump, likely a backup. Can be deleted if you are sure you do not need this backup._

- `/home/vendure/.bashrc`, `/home/vendure/.profile`, `/home/vendure/.bash_logout`  
  _Shell configuration files. Needed for customizing your shell environment._

- `/home/vendure/.psql_history`, `/home/vendure/.viminfo`, `/home/vendure/.lesshst`  
  _Editor/CLI history files. Can be deleted but will lose command history._

- `/home/vendure/.selected_editor`  
  _Tracks your preferred editor for commands._

- `/home/vendure/.wget-hsts`  
  _Wget history file. Not critical._

- `/home/vendure/.npm`, `/home/vendure/.yarn`, `/home/vendure/.vscode`, `/home/vendure/.vscode-server`  
  _Tooling directories for package managers and editors._

- `/home/vendure/.cache`, `/home/vendure/.local`, `/home/vendure/.config`  
  _Standard user config/cache directories._

---

*This file will be updated as the scan proceeds.*
