#!/usr/bin/env ts-node

import { bootstrap } from '@vendure/core';
import { config } from '../src/vendure-config.js';
import { StaleOrderCleanupService } from '../src/services/stale-order-cleanup.service.js';

/**
 * Manual cleanup script to test the stale order cleanup service
 * 
 * Usage:
 *   pnpm exec ts-node scripts/manual-cleanup.ts [maxAgeMinutes]
 * 
 * Examples:
 *   pnpm exec ts-node scripts/manual-cleanup.ts        # Use default timeout (60 minutes)
 *   pnpm exec ts-node scripts/manual-cleanup.ts 30     # Use 30 minutes timeout
 */

async function runManualCleanup() {
    const args = process.argv.slice(2);
    const maxAgeMinutes = args[0] ? parseInt(args[0], 10) : undefined;
    
    console.log('🚀 Starting manual stale order cleanup...');
    if (maxAgeMinutes) {
        console.log(`⏰ Using custom timeout: ${maxAgeMinutes} minutes`);
    } else {
        console.log('⏰ Using default timeout from environment');
    }
    
    try {
        // Create a modified config for CLI use with different port
        const cliConfig = {
            ...config,
            apiOptions: {
                ...config.apiOptions,
                port: 3001, // Use a different port
            }
        };

        // Bootstrap Vendure
        const app = await bootstrap(cliConfig);

        // Get the cleanup service
        const cleanupService = app.get(StaleOrderCleanupService);
        
        // Trigger manual cleanup
        const cancelledCount = await cleanupService.triggerManualCleanup(maxAgeMinutes);
        
        console.log(`✅ Manual cleanup completed: cancelled ${cancelledCount} stale orders`);
        
        // Close the application
        await app.close();
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Manual cleanup failed:', error);
        process.exit(1);
    }
}

// Run the cleanup
runManualCleanup().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
