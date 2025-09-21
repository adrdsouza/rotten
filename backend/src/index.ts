import { bootstrap, runMigrations, Logger } from '@vendure/core';
import { config } from './vendure-config';

const IS_DEV = process.env.APP_ENV !== 'prod';

// In production, migrations should be run manually with: npx vendure migrate
// In development, we can auto-run them for convenience
if (IS_DEV) {
    runMigrations(config)
        .then(() => bootstrap(config))
        .catch(err => {
            console.error('Fatal error during server bootstrap:', err);
            if (err && err.stack) {
                console.error(err.stack);
            }
            process.exit(1);
        });
} else {
    // Production: skip auto-migrations, just bootstrap
    bootstrap(config)
        .catch(err => {
            console.error('Fatal error during server bootstrap:', err);
            if (err && err.stack) {
                console.error(err.stack);
            }
            process.exit(1);
        });
}
