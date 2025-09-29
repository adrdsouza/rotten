# Scripts Directory

This directory contains various utility scripts for managing the Rotten Hand application.

## Maintenance Scripts

### `maint-on.sh`
Enables maintenance mode by:
- Stopping the normal store process
- Starting the simple maintenance server on port 4000
- Serving the maintenance page for all requests

Usage: `./scripts/maint-on.sh`

### `maint-off.sh`
Disables maintenance mode by:
- Stopping the maintenance server
- Restoring the normal frontend application

Usage: `./scripts/maint-off.sh`

### `simple-maintenance-server.js`
A simple Node.js HTTP server that serves the maintenance page for all requests.
- Runs on port 4000
- Serves `maintenance.html` with proper cache headers
- Handles graceful shutdown

### `maintenance.html`
The HTML page displayed during maintenance mode.
- Styled with Rotten Hand branding
- Responsive design
- Loading spinner animation

## NPM Management Scripts

### `block-npm.sh`
Blocks npm usage to enforce pnpm usage in the project.

### `disable-npm.sh`
Disables npm temporarily.

### `enable-npm.sh`
Re-enables npm usage.

## Application Scripts

### `start-vendure.sh`
Script to start the Vendure application with proper configuration.

## Usage Notes

- All scripts should be run from the project root directory
- Maintenance scripts use PM2 for process management
- The maintenance server will persist until explicitly stopped
- No terminal needs to stay open for maintenance mode to work
