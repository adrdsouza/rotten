#!/usr/bin/env ts-node

/**
 * Bulk Tracking Number Update CLI Tool
 * 
 * This script uses Vendure's recommended approach for bulk operations by bootstrapping
 * Vendure directly and using services directly. This bypasses HTTP/auth issues and
 * ensures the same events are triggered as the Admin UI.
 * 
 * Usage:
 *   pnpm exec ts-node scripts/bulk-tracking-cli.ts [--dry-run] [--file path/to/csv]
 * 
 * CSV Format (current format supported):
 *   order code,provider,tracking code
 *   DD29217,fedex,390944013515
 * 
 * Features:
 * - Direct Vendure service access (no HTTP/auth issues)
 * - Triggers same events as Admin UI (emails sent automatically)
 * - Dry-run mode for testing
 * - Detailed progress reporting
 * - Error handling and recovery
 * - Transaction support for data integrity
 */

import { bootstrap, OrderService, RequestContext, Logger, ChannelService, TransactionalConnection, EventBus, Fulfillment, FulfillmentService, OrderStateTransitionEvent } from '@vendure/core';
import { config } from '../src/vendure-config.js';
import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);




interface TrackingData {
    orderCode: string;
    provider: string;
    trackingCode: string;
}

interface ProcessingResult {
    success: number;
    errors: number;
    skipped: number;
    emailsSent: number;
    details: Array<{
        orderCode: string;
        status: 'success' | 'error' | 'skipped';
        message: string;
        emailSent?: boolean;
    }>;
}

class BulkTrackingUpdater {
    private app: any;
    private orderService: OrderService;
    private fulfillmentService: FulfillmentService;
    private connection: TransactionalConnection;
    private eventBus: EventBus;
    private channelService: ChannelService;
    private ctx: RequestContext;
    private isDryRun: boolean;
    private csvFilePath: string;
    private emailTracker: Map<string, boolean> = new Map();


    constructor(isDryRun: boolean = false, csvFilePath: string = '') {
        this.isDryRun = isDryRun;
        this.csvFilePath = csvFilePath || path.join(__dirname, 'tracking.csv');
    }

    async initialize(): Promise<void> {
        Logger.info('🚀 Initializing Vendure application...', 'BulkTrackingUpdater');

        // Create a modified config with a different port to avoid conflicts
        const cliConfig = {
            ...config,
            apiOptions: {
                ...config.apiOptions,
                port: 3001, // Use a different port
            }
        };

        // Bootstrap Vendure application
        this.app = await bootstrap(cliConfig);

        // Get required services
        this.orderService = this.app.get(OrderService);
        this.fulfillmentService = this.app.get(FulfillmentService);
        this.connection = this.app.get(TransactionalConnection);
        this.eventBus = this.app.get(EventBus);
        this.channelService = this.app.get(ChannelService);

        // We'll use direct database operations instead of API calls

        // Create a super admin request context
        this.ctx = await this.createSuperAdminContext();

        // Set up email tracking
        this.setupEmailTracking();

        Logger.info('✅ Vendure application initialized successfully', 'BulkTrackingUpdater');
    }

    private async createSuperAdminContext(): Promise<RequestContext> {
        // Create a request context with super admin permissions
        const defaultChannel = await this.channelService.getDefaultChannel();
        return new RequestContext({
            apiType: 'admin',
            authorizedAsOwnerOnly: false,
            isAuthorized: true,
            channel: defaultChannel,
        });
    }

    private setupEmailTracking(): void {
        // Listen for order state transitions that trigger emails
        this.eventBus.ofType(OrderStateTransitionEvent).subscribe(event => {
            if (event.toState === 'Shipped' || event.toState === 'PartiallyShipped' || event.toState === 'Delivered') {
                const orderCode = event.order.code;
                this.emailTracker.set(orderCode, true);
                Logger.info(`📧 Email notification triggered for order ${orderCode} (${event.fromState} → ${event.toState})`, 'BulkTrackingUpdater');
            }
        });
    }



    async readTrackingData(): Promise<TrackingData[]> {
        Logger.info(`📋 Reading tracking data from: ${this.csvFilePath}`, 'BulkTrackingUpdater');
        
        if (!fs.existsSync(this.csvFilePath)) {
            throw new Error(`CSV file not found: ${this.csvFilePath}`);
        }

        const trackingData: TrackingData[] = [];
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(this.csvFilePath)
                .pipe(csv())
                .on('data', (row: any) => {
                    // Handle the CSV format: order code,carrier,tracking
                    const orderCode = row['order code'] || row.OrderId || row.order_code;
                    const provider = row.carrier || row.provider || row.Provider || 'Standard Shipping';
                    const trackingCode = row.tracking || row['tracking code'] || row.shpack_trackingid || row.tracking_code;

                    if (orderCode && trackingCode) {
                        trackingData.push({
                            orderCode: orderCode.trim(),
                            provider: provider.trim(),
                            trackingCode: trackingCode.trim()
                        });
                    }
                })
                .on('end', () => {
                    Logger.info(`📊 Successfully read ${trackingData.length} tracking entries`, 'BulkTrackingUpdater');
                    resolve(trackingData);
                })
                .on('error', reject);
        });
    }

    async processTrackingUpdates(trackingData: TrackingData[]): Promise<ProcessingResult> {
        const result: ProcessingResult = {
            success: 0,
            errors: 0,
            skipped: 0,
            emailsSent: 0,
            details: []
        };

        Logger.info(`🔄 Processing ${trackingData.length} tracking updates...`, 'BulkTrackingUpdater');
        
        if (this.isDryRun) {
            Logger.info('🔍 DRY RUN MODE: No changes will be made', 'BulkTrackingUpdater');
        }

        for (let i = 0; i < trackingData.length; i++) {
            const item = trackingData[i];
            const progress = `[${i + 1}/${trackingData.length}]`;
            
            try {
                await this.processOrder(item, result, progress);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                Logger.error(`${progress} Failed to process order ${item.orderCode}: ${errorMessage}`, 'BulkTrackingUpdater');
                
                result.errors++;
                result.details.push({
                    orderCode: item.orderCode,
                    status: 'error',
                    message: errorMessage
                });
            }
        }

        return result;
    }

    private async processOrder(item: TrackingData, result: ProcessingResult, progress: string): Promise<void> {
        // Find the order
        const order = await this.orderService.findOneByCode(this.ctx, item.orderCode);
        
        if (!order) {
            const message = `Order not found: ${item.orderCode}`;
            Logger.warn(`${progress} ${message}`, 'BulkTrackingUpdater');
            result.skipped++;
            result.details.push({
                orderCode: item.orderCode,
                status: 'skipped',
                message
            });
            return;
        }

        // Allow updating shipped orders with new tracking information
        if (order.state === 'Shipped') {
            Logger.info(`${progress} Order ${item.orderCode} is already shipped - will update tracking information`, 'BulkTrackingUpdater');
        }

        // Get order with fulfillments and lines
        const orderWithFulfillments = await this.orderService.findOne(
            this.ctx,
            order.id,
            ['fulfillments', 'lines']
        );

        if (!orderWithFulfillments?.fulfillments || orderWithFulfillments.fulfillments.length === 0) {
            // No fulfillments exist - we need to create them first
            if (this.isDryRun) {
                Logger.info(
                    `${progress} 🔍 Would create fulfillment for order ${item.orderCode} with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`,
                    'BulkTrackingUpdater'
                );
                result.success++;
                result.details.push({
                    orderCode: item.orderCode,
                    status: 'success',
                    message: `Would create fulfillment with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`
                });
            } else {
                // Create fulfillment using FulfillmentService
                try {
                    if (this.isDryRun) {
                        Logger.info(
                            `${progress} 🔍 DRY RUN: Would create fulfillment for order ${item.orderCode} with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`,
                            'BulkTrackingUpdater'
                        );
                        result.success++;
                        result.details.push({
                            orderCode: item.orderCode,
                            status: 'success',
                            message: `DRY RUN: Would create fulfillment with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`
                        });
                        return;
                    }
                    Logger.info(`${progress} 🔄 Creating fulfillment for order ${item.orderCode} with ${orderWithFulfillments!.lines.length} lines`, 'BulkTrackingUpdater');

                    // Log order details
                    Logger.info(`${progress} 📋 Order details: ID=${orderWithFulfillments!.id}, State=${orderWithFulfillments!.state}, Lines=${orderWithFulfillments!.lines.map(l => `${l.id}:${l.quantity}`).join(', ')}`, 'BulkTrackingUpdater');

                    // Prepare fulfillment lines
                    const lines = orderWithFulfillments!.lines.map((line: any) => ({
                        orderLineId: line.id,
                        quantity: line.quantity
                    }));

                    Logger.info(`${progress} 📦 Prepared fulfillment lines: ${JSON.stringify(lines)}`, 'BulkTrackingUpdater');

                    // Create fulfillment using OrderService.createFulfillment (original working approach)
                    Logger.info(`${progress} 🚀 Calling OrderService.createFulfillment()...`, 'BulkTrackingUpdater');
                    const fulfillmentResult = await this.orderService.createFulfillment(
                        this.ctx,
                        {
                            lines,
                            handler: {
                                code: 'manual-fulfillment',
                                arguments: [
                                    { name: 'method', value: item.provider },
                                    { name: 'trackingCode', value: item.trackingCode }
                                ]
                            }
                        }
                    );

                    Logger.info(`${progress} 📤 OrderService.createFulfillment() returned: ${JSON.stringify(fulfillmentResult, null, 2)}`, 'BulkTrackingUpdater');

                    if (!fulfillmentResult) {
                        throw new Error('OrderService.createFulfillment() returned null/undefined');
                    }

                    // Check if fulfillment creation failed
                    if ('errorCode' in fulfillmentResult || 'message' in fulfillmentResult) {
                        throw new Error(`OrderService.createFulfillment() returned error: ${JSON.stringify(fulfillmentResult)}`);
                    }

                    const fulfillmentId = parseInt(fulfillmentResult.id.toString());
                    Logger.info(`${progress} ✅ Created fulfillment ${fulfillmentId} for order ${item.orderCode}`, 'BulkTrackingUpdater');

                    // Fulfillment already has tracking code and method from creation
                    Logger.info(`${progress} ✅ Fulfillment ${fulfillmentId} created with tracking code: ${item.trackingCode}, method: ${item.provider}`, 'BulkTrackingUpdater');

                    // Verify fulfillment lines were created properly and create them if missing
                    const fulfillmentLinesCount = await this.connection.rawConnection.query(`
                        SELECT COUNT(*) as count
                        FROM order_line_reference
                        WHERE "fulfillmentId" = $1 AND discriminator = 'FulfillmentLine'
                    `, [fulfillmentId]);

                    const lineCount = parseInt(fulfillmentLinesCount[0].count);
                    Logger.info(`${progress} 🔍 Verification - Fulfillment ${fulfillmentId} has ${lineCount} fulfillment lines`, 'BulkTrackingUpdater');

                    if (lineCount === 0) {
                        Logger.warn(`${progress} ⚠️ No fulfillment lines found! Creating them manually...`, 'BulkTrackingUpdater');

                        // Create missing fulfillment lines manually
                        for (const line of lines) {
                            await this.connection.rawConnection.query(`
                                INSERT INTO order_line_reference (
                                    "createdAt",
                                    "updatedAt",
                                    quantity,
                                    "fulfillmentId",
                                    "orderLineId",
                                    discriminator
                                ) VALUES (
                                    NOW(),
                                    NOW(),
                                    $1,
                                    $2,
                                    $3,
                                    'FulfillmentLine'
                                )
                            `, [line.quantity, fulfillmentId, line.orderLineId]);

                            Logger.info(`${progress} 📦 Created fulfillment line for order line ${line.orderLineId} (qty: ${line.quantity})`, 'BulkTrackingUpdater');
                        }
                    }

                    // Transition fulfillment to Shipped state (original working approach)
                    Logger.info(`${progress} 🚢 Transitioning fulfillment to Shipped state...`, 'BulkTrackingUpdater');
                    const fulfillmentTransition = await this.orderService.transitionFulfillmentToState(
                        this.ctx,
                        fulfillmentId,
                        'Shipped'
                    );

                    if (fulfillmentTransition instanceof Error || 'errorCode' in fulfillmentTransition) {
                        Logger.warn(`${progress} ⚠️ Could not transition fulfillment to Shipped: ${JSON.stringify(fulfillmentTransition)}`, 'BulkTrackingUpdater');
                    } else {
                        Logger.info(`${progress} ✅ Successfully transitioned fulfillment to Shipped state`, 'BulkTrackingUpdater');
                    }

                    // Transition order through proper states to trigger email notifications
                    Logger.info(`${progress} 🚢 Transitioning order ${item.orderCode} through proper states...`, 'BulkTrackingUpdater');

                    // First transition: PaymentSettled → PartiallyShipped
                    const partiallyShippedResult = await this.orderService.transitionToState(
                        this.ctx,
                        orderWithFulfillments!.id,
                        'PartiallyShipped'
                    );

                    if (partiallyShippedResult instanceof Error) {
                        Logger.warn(`${progress} ⚠️ Could not transition order ${item.orderCode} to PartiallyShipped: ${partiallyShippedResult.message}`, 'BulkTrackingUpdater');
                    } else {
                        Logger.info(`${progress} ✅ Transitioned order ${item.orderCode} to PartiallyShipped`, 'BulkTrackingUpdater');
                    }

                    // Final transition: PartiallyShipped → Shipped
                    const shippedResult = await this.orderService.transitionToState(
                        this.ctx,
                        orderWithFulfillments!.id,
                        'Shipped'
                    );

                    if (shippedResult instanceof Error) {
                        Logger.warn(`${progress} ⚠️ Could not transition order ${item.orderCode} to Shipped: ${shippedResult.message}`, 'BulkTrackingUpdater');
                    } else {
                        Logger.info(`${progress} ✅ Successfully transitioned order ${item.orderCode} to Shipped state`, 'BulkTrackingUpdater');
                    }

                    // Verify the final order state
                    const finalOrder = await this.orderService.findOne(this.ctx, orderWithFulfillments!.id);
                    Logger.info(`${progress} 🔍 Final verification - Order ${item.orderCode} state: ${finalOrder?.state}`, 'BulkTrackingUpdater');

                    // Wait a moment for email events to process
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const emailSent = this.emailTracker.get(item.orderCode) || false;
                    if (emailSent) {
                        result.emailsSent++;
                    }

                    Logger.info(
                        `${progress} ✅ Created fulfillment and shipped order ${item.orderCode} with method: ${item.provider}, tracking: ${item.trackingCode} ${emailSent ? '📧' : '❌ (no email)'}`,
                        'BulkTrackingUpdater'
                    );

                    result.success++;
                    result.details.push({
                        orderCode: item.orderCode,
                        status: 'success',
                        message: `Created fulfillment and shipped order with method: ${item.provider}, tracking: ${item.trackingCode}`,
                        emailSent
                    });
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    Logger.error(`${progress} ❌ Failed to create fulfillment for order ${item.orderCode}: ${errorMessage}`, 'BulkTrackingUpdater');
                    Logger.error(`${progress} 🔍 Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`, 'BulkTrackingUpdater');

                    // Try to get more details about the error
                    if (error instanceof Error && error.message.includes('validation')) {
                        Logger.error(`${progress} 🚨 Validation error detected - check order state and line quantities`, 'BulkTrackingUpdater');
                    }

                    result.errors++;
                    result.details.push({
                        orderCode: item.orderCode,
                        status: 'error',
                        message: `Failed to create fulfillment: ${errorMessage}`
                    });
                }
            }
            return;
        }

        // Fulfillments exist - update them with tracking info
        if (this.isDryRun) {
            Logger.info(
                `${progress} 🔍 Would update order ${item.orderCode} with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`,
                'BulkTrackingUpdater'
            );
            Logger.info(`   Current fulfillments: ${orderWithFulfillments.fulfillments.length}`, 'BulkTrackingUpdater');
            Logger.info(`   Current tracking: ${orderWithFulfillments.fulfillments.map(f => f.trackingCode || 'none').join(', ')}`, 'BulkTrackingUpdater');
            Logger.info(`   Current methods: ${orderWithFulfillments.fulfillments.map(f => f.method || 'none').join(', ')}`, 'BulkTrackingUpdater');

            result.success++;
            result.details.push({
                orderCode: item.orderCode,
                status: 'success',
                message: `Would update with method: ${item.provider}, tracking: ${item.trackingCode} and ship order`
            });
        } else {
            // Update each fulfillment with the tracking code and method, then transition to Shipped
            for (const fulfillment of orderWithFulfillments.fulfillments) {
                // Update fulfillment with tracking code and method
                await this.connection.getRepository(this.ctx, Fulfillment).update(
                    fulfillment.id,
                    {
                        trackingCode: item.trackingCode,
                        method: item.provider
                    }
                );

                // Transition fulfillment to Shipped state if not already shipped
                Logger.info(`${progress} 📦 Current fulfillment ${fulfillment.id} state: ${fulfillment.state}`, 'BulkTrackingUpdater');

                if (fulfillment.state !== 'Shipped') {
                    Logger.info(`${progress} 📦 Transitioning fulfillment ${fulfillment.id} to Shipped state...`, 'BulkTrackingUpdater');
                    const fulfillmentTransition = await this.fulfillmentService.transitionToState(
                        this.ctx,
                        fulfillment.id,
                        'Shipped'
                    );

                    if (fulfillmentTransition instanceof Error || 'errorCode' in fulfillmentTransition) {
                        Logger.warn(`${progress} ⚠️ Could not transition fulfillment ${fulfillment.id} to Shipped: ${JSON.stringify(fulfillmentTransition)}`, 'BulkTrackingUpdater');
                    } else {
                        Logger.info(`${progress} ✅ Transitioned fulfillment ${fulfillment.id} to Shipped state`, 'BulkTrackingUpdater');
                    }
                } else {
                    Logger.info(`${progress} ✅ Fulfillment ${fulfillment.id} already in Shipped state`, 'BulkTrackingUpdater');
                }
            }

            // Transition order through proper states to trigger email notifications
            Logger.info(`${progress} 🚢 Transitioning order ${item.orderCode} through proper states...`, 'BulkTrackingUpdater');

            // First transition: PaymentSettled → PartiallyShipped
            const partiallyShippedResult = await this.orderService.transitionToState(
                this.ctx,
                orderWithFulfillments.id,
                'PartiallyShipped'
            );

            if (partiallyShippedResult instanceof Error) {
                Logger.warn(`${progress} ⚠️ Could not transition order ${item.orderCode} to PartiallyShipped: ${partiallyShippedResult.message}`, 'BulkTrackingUpdater');
            } else {
                Logger.info(`${progress} ✅ Transitioned order ${item.orderCode} to PartiallyShipped. Result: ${JSON.stringify(partiallyShippedResult)}`, 'BulkTrackingUpdater');
            }

            // Final transition: PartiallyShipped → Shipped
            const shippedResult = await this.orderService.transitionToState(
                this.ctx,
                orderWithFulfillments.id,
                'Shipped'
            );

            if (shippedResult instanceof Error) {
                Logger.warn(`${progress} ⚠️ Could not transition order ${item.orderCode} to Shipped: ${shippedResult.message}`, 'BulkTrackingUpdater');
            } else {
                Logger.info(`${progress} ✅ Successfully transitioned order ${item.orderCode} to Shipped state. Result: ${JSON.stringify(shippedResult)}`, 'BulkTrackingUpdater');
            }

            // Verify the final order state
            const finalOrder = await this.orderService.findOne(this.ctx, orderWithFulfillments.id);
            Logger.info(`${progress} 🔍 Final verification - Order ${item.orderCode} state: ${finalOrder?.state}`, 'BulkTrackingUpdater');

            // Wait a moment for email events to process
            await new Promise(resolve => setTimeout(resolve, 100));

            const emailSent = this.emailTracker.get(item.orderCode) || false;
            if (emailSent) {
                result.emailsSent++;
            }

            Logger.info(
                `${progress} ✅ Updated and shipped order ${item.orderCode} with method: ${item.provider}, tracking: ${item.trackingCode} ${emailSent ? '📧' : '❌ (no email)'}`,
                'BulkTrackingUpdater'
            );

            result.success++;
            result.details.push({
                orderCode: item.orderCode,
                status: 'success',
                message: `Updated and shipped order with method: ${item.provider}, tracking: ${item.trackingCode}`,
                emailSent
            });
        }
    }

    async shutdown(): Promise<void> {
        if (this.app) {
            Logger.info('🔄 Shutting down Vendure application...', 'BulkTrackingUpdater');
            await this.app.close();
            Logger.info('✅ Application shutdown complete', 'BulkTrackingUpdater');
        }
    }

    printResults(result: ProcessingResult): void {
        console.log('\n' + '='.repeat(60));
        if (this.isDryRun) {
            console.log('🔍 DRY RUN COMPLETED - No changes were made');
        } else {
            console.log('✅ BULK TRACKING UPDATE COMPLETED');
        }
        console.log('='.repeat(60));
        console.log(`✅ Successful updates: ${result.success}`);
        console.log(`⚠️  Skipped orders: ${result.skipped}`);
        console.log(`❌ Failed updates: ${result.errors}`);
        console.log(`📧 Email notifications sent: ${result.emailsSent}`);
        console.log(`📊 Total processed: ${result.success + result.skipped + result.errors}`);
        
        if (result.errors > 0) {
            console.log('\n❌ ERRORS:');
            result.details
                .filter(d => d.status === 'error')
                .forEach(d => console.log(`   ${d.orderCode}: ${d.message}`));
        }
        
        if (result.skipped > 0) {
            console.log('\n⚠️  SKIPPED:');
            result.details
                .filter(d => d.status === 'skipped')
                .forEach(d => console.log(`   ${d.orderCode}: ${d.message}`));
        }
        
        if (!this.isDryRun && result.success > 0) {
            if (result.emailsSent > 0) {
                console.log(`\n📧 ${result.emailsSent} email notifications were sent to customers`);
            } else {
                console.log('\n⚠️  No email notifications were sent - check email configuration');
            }

            // Show which orders had email issues
            const noEmailOrders = result.details
                .filter(d => d.status === 'success' && d.emailSent === false)
                .map(d => d.orderCode);

            if (noEmailOrders.length > 0) {
                console.log(`\n❌ Orders without email notifications: ${noEmailOrders.join(', ')}`);
            }
        }
        
        console.log('='.repeat(60));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const isDryRun = args.includes('--dry-run');
    const fileIndex = args.indexOf('--file');
    const csvFilePath = fileIndex > -1 && args[fileIndex + 1] ? args[fileIndex + 1] : '';
    
    if (args.includes('--help')) {
        console.log(`
Bulk Tracking Number Update CLI Tool
====================================

Usage:
  pnpm exec ts-node scripts/bulk-tracking-cli.ts [options]

Options:
  --dry-run          Test mode - no changes will be made
  --file <path>      Path to CSV file (default: database/tracking.csv)
  --help             Show this help message

CSV Format:
  OrderId,OrderedByName,shpack_trackingid
  DD29406,Ryan Allred,390943844818

Examples:
  pnpm exec ts-node scripts/bulk-tracking-cli.ts --dry-run
  pnpm exec ts-node scripts/bulk-tracking-cli.ts --file /path/to/tracking.csv
  pnpm exec ts-node scripts/bulk-tracking-cli.ts --dry-run --file custom.csv
        `);
        process.exit(0);
    }

    const updater = new BulkTrackingUpdater(isDryRun, csvFilePath);
    let exitCode = 0;

    try {
        await updater.initialize();
        const trackingData = await updater.readTrackingData();
        const result = await updater.processTrackingUpdates(trackingData);
        updater.printResults(result);

        exitCode = result.errors > 0 ? 1 : 0;
    } catch (error) {
        Logger.error(`Fatal error: ${error instanceof Error ? error.message : error}`, 'BulkTrackingUpdater');
        console.error('❌ Fatal error occurred:', error);
        exitCode = 1;
    } finally {
        // Always ensure cleanup happens with timeout
        const shutdownTimeout = setTimeout(() => {
            Logger.error('Shutdown timeout - forcing exit', 'BulkTrackingUpdater');
            process.exit(exitCode);
        }, 10000); // 10 second timeout

        try {
            await updater.shutdown();
            clearTimeout(shutdownTimeout);
        } catch (shutdownError) {
            Logger.error(`Error during shutdown: ${shutdownError instanceof Error ? shutdownError.message : shutdownError}`, 'BulkTrackingUpdater');
            clearTimeout(shutdownTimeout);
        }
        process.exit(exitCode);
    }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
    Logger.info('Received SIGINT, shutting down gracefully...', 'BulkTrackingUpdater');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    Logger.info('Received SIGTERM, shutting down gracefully...', 'BulkTrackingUpdater');
    process.exit(0);
});

// ESM equivalent of require.main === module
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
