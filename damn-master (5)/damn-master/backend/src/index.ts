import { bootstrap, runMigrations, Logger } from '@vendure/core';
import { config } from './vendure-config.js';

const IS_PRODUCTION = process.env.APP_ENV === 'prod' || process.env.NODE_ENV === 'production';

runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        // Log full error details server-side
        Logger.error('Fatal error during server bootstrap', 'Bootstrap', err.stack || err.message);

        // Display sanitized error message (PCI compliance)
        if (IS_PRODUCTION) {
            // Generic error message in production
            console.error('Server failed to start. Please check server logs for details.');
        } else {
            // Detailed error in development
            console.error('Fatal error during server bootstrap:', err);
            if (err && err.stack) {
                console.error(err.stack);
            }
        }

        process.exit(1);
    });
