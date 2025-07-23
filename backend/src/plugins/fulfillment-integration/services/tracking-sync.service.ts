import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  RequestContext, 
  OrderService, 
  TransactionalConnection,
  EventBus,
} from '@vendure/core';
import { VeraCoreApiService } from './veracore-api.service';
import { VeraCoreOrderSyncEntity, SyncStatus } from '../entities/veracore-order-sync.entity';
import { VeraCoreConfigEntity } from '../entities/veracore-config.entity';

interface TrackingSyncResult {
  ordersChecked: number;
  trackingUpdated: number;
  errors: number;
}

@Injectable()
export class TrackingSyncService {
  private readonly logger = new Logger(TrackingSyncService.name);
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor(
    private orderService: OrderService,
    private veracoreApiService: VeraCoreApiService,
    private connection: TransactionalConnection,
    private eventBus: EventBus,
  ) {}

  @Cron('0 */30 9-19 * * 1-5', { timeZone: 'America/Los_Angeles' }) // Every 30 min, 9 AM-7 PM, Mon-Fri, LA time
  async scheduledTrackingSync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Tracking sync already running, skipping scheduled sync');
      return;
    }

    const ctx = RequestContext.empty();
    const config = await this.connection.getRepository(ctx, VeraCoreConfigEntity).findOne({
      where: { syncEnabled: true },
    });

    if (!config) {
      this.logger.warn('VeraCore configuration not found or sync disabled');
      return;
    }

    await this.syncTracking(ctx);
  }

  async syncTracking(ctx: RequestContext): Promise<TrackingSyncResult> {
    if (this.isRunning) {
      throw new Error('Tracking sync is already running');
    }

    this.isRunning = true;
    const startTime = new Date();
    
    this.logger.log('Starting tracking synchronization from VeraCore');

    const result: TrackingSyncResult = {
      ordersChecked: 0,
      trackingUpdated: 0,
      errors: 0,
    };

    try {
      // Get all successfully synced orders that don't have tracking yet
      const ordersToCheck = await this.getOrdersNeedingTracking(ctx);
      
      this.logger.log(`Checking tracking for ${ordersToCheck.length} orders`);

      for (const syncRecord of ordersToCheck) {
        result.ordersChecked++;
        
        try {
          const trackingUpdated = await this.updateOrderTracking(ctx, syncRecord);
          if (trackingUpdated) {
            result.trackingUpdated++;
          }
        } catch (error) {
          this.logger.error(`Failed to update tracking for order ${syncRecord.vendureOrderCode}`, error);
          result.errors++;
        }
      }

      this.lastSyncTime = new Date();
      
      // Update config with last sync time
      const config = await this.connection.getRepository(ctx, VeraCoreConfigEntity).findOne({
        where: {},
      });
      if (config) {
        config.lastTrackingSync = this.lastSyncTime;
        await this.connection.getRepository(ctx, VeraCoreConfigEntity).save(config);
      }

      const duration = this.lastSyncTime.getTime() - startTime.getTime();
      this.logger.log(`Tracking sync completed in ${duration}ms`, result);

    } catch (error) {
      this.logger.error('Tracking sync failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  private async getOrdersNeedingTracking(ctx: RequestContext): Promise<VeraCoreOrderSyncEntity[]> {
    return this.connection.getRepository(ctx, VeraCoreOrderSyncEntity)
      .createQueryBuilder('sync')
      .leftJoin('order', 'o', 'o.id = sync.vendureOrderId')
      .where('sync.syncStatus = :status', { status: SyncStatus.SUCCESS })
      .andWhere('sync.veracoreOrderId IS NOT NULL')
      .andWhere('(o.trackingCode IS NULL OR o.trackingCode = \'\')')
      .andWhere('o.state IN (:...states)', { 
        states: ['PaymentSettled', 'PartiallyFulfilled', 'Fulfilled', 'Shipped'] 
      })
      .getMany();
  }

  private async updateOrderTracking(ctx: RequestContext, syncRecord: VeraCoreOrderSyncEntity): Promise<boolean> {
    try {
      // Get order status from VeraCore
      const orderStatus = await this.veracoreApiService.getOrderStatus(ctx, syncRecord.vendureOrderCode);
      
      if (!orderStatus || !orderStatus.TrackingNumber) {
        return false; // No tracking available yet
      }

      // Get the Vendure order
      const order = await this.orderService.findOne(ctx, syncRecord.vendureOrderId);
      if (!order) {
        this.logger.error(`Order ${syncRecord.vendureOrderId} not found in Vendure`);
        return false;
      }

      // Skip if tracking already exists and matches
      if ((order as any).trackingCode === orderStatus.TrackingNumber) {
        return false;
      }

      // Update the order with tracking information - using custom fields
      await this.orderService.updateCustomFields(ctx, order.id, {
        trackingCode: orderStatus.TrackingNumber,
        carrier: orderStatus.Carrier || '',
        shipDate: orderStatus.ShipDate ? new Date(orderStatus.ShipDate) : null,
      });

      // Update sync record with tracking info
      syncRecord.syncMetadata = {
        ...syncRecord.syncMetadata,
        trackingInfo: {
          trackingNumber: orderStatus.TrackingNumber,
          carrier: orderStatus.Carrier,
          shipDate: orderStatus.ShipDate,
          status: orderStatus.Status,
        },
      };
      await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).save(syncRecord);

      // Transition order state if needed
      if (orderStatus.Status === 'Shipped' && order.state !== 'Shipped') {
        try {
          await this.orderService.transitionToState(ctx, order.id, 'Shipped');
        } catch (error) {
          this.logger.warn(`Could not transition order ${order.code} to Shipped state`, error);
        }
      }

      this.logger.log(`Updated tracking for order ${order.code}: ${orderStatus.TrackingNumber}`);
      
      // Log tracking update (could emit custom event here if needed)
      this.logger.log(`Tracking updated for order ${order.code}: ${orderStatus.TrackingNumber}`);

      return true;
    } catch (error) {
      this.logger.error(`Error updating tracking for order ${syncRecord.vendureOrderCode}`, error);
      throw error;
    }
  }

  async syncTrackingForOrder(ctx: RequestContext, orderId: string): Promise<boolean> {
    const syncRecord = await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).findOne({
      where: { vendureOrderId: orderId },
    });

    if (!syncRecord || syncRecord.syncStatus !== SyncStatus.SUCCESS) {
      this.logger.warn(`Order ${orderId} not found or not successfully synced with VeraCore`);
      return false;
    }

    return await this.updateOrderTracking(ctx, syncRecord);
  }

  async getTrackingSyncStats(ctx: RequestContext): Promise<{
    lastSyncTime: Date | null;
    isRunning: boolean;
    totalOrdersTracked: number;
  }> {
    const totalOrdersTracked = await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity)
      .createQueryBuilder('sync')
      .leftJoin('order', 'o', 'o.id = sync.vendureOrderId')
      .where('sync.syncStatus = :status', { status: SyncStatus.SUCCESS })
      .andWhere('o.trackingCode IS NOT NULL')
      .andWhere('o.trackingCode != \'\'')
      .getCount();

    return {
      lastSyncTime: this.lastSyncTime,
      isRunning: this.isRunning,
      totalOrdersTracked,
    };
  }

  async forceTrackingSync(ctx: RequestContext): Promise<TrackingSyncResult> {
    this.logger.log('Force starting tracking synchronization');
    return await this.syncTracking(ctx);
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }
}
