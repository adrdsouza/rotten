import { bootstrap, runMigrations } from '@vendure/core';
import { config } from './vendure-config';

runMigrations(config)
    .then(() => bootstrap(config))
    .catch(err => {
        console.error('Fatal error during server bootstrap:', err);
        if (err && err.stack) {
            console.error(err.stack);
        }
        process.exit(1);
    });
