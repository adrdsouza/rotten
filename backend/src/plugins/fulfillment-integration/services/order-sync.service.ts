import { Injectable, Logger } from '@nestjs/common';
import { RequestContext, OrderService, TransactionalConnection, Order } from '@vendure/core';
import { VeraCoreApiService } from './veracore-api.service';
import { VeraCoreOrderSyncEntity, SyncStatus } from '../entities/veracore-order-sync.entity';
import { VeraCoreConfigEntity } from '../entities/veracore-config.entity';

@Injectable()
export class OrderSyncService {
  private readonly logger = new Logger(OrderSyncService.name);

  constructor(
    private orderService: OrderService,
    private veracoreApiService: VeraCoreApiService,
    private connection: TransactionalConnection,
  ) {}

  async syncOrder(ctx: RequestContext, orderId: string): Promise<void> {
    try {
      // Get the order with all relations
      const order = await this.orderService.findOne(ctx, orderId, [
        'lines',
        'lines.productVariant',
        'customer',
      ]);

      if (!order) {
        this.logger.error(`Order ${orderId} not found`);
        return;
      }

      // Check if order has already been synced successfully
      const existingSync = await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).findOne({
        where: { vendureOrderId: orderId },
      });

      if (existingSync && existingSync.syncStatus === SyncStatus.SUCCESS) {
        this.logger.log(`Order ${order.code} already synced successfully`);
        return;
      }

      // Create or update sync record
      const syncRecord = existingSync || new VeraCoreOrderSyncEntity();
      syncRecord.vendureOrderId = orderId;
      syncRecord.vendureOrderCode = order.code;
      syncRecord.syncStatus = SyncStatus.PENDING;
      syncRecord.lastSyncAttempt = new Date();

      await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).save(syncRecord);

      // Transform order to VeraCore format
      const orderData = await this.mapOrderToVeraCoreFormat(ctx, order);

      // Attempt to sync with VeraCore
      const result = await this.veracoreApiService.createOrder(ctx, orderData);

      if (result.success) {
        syncRecord.syncStatus = SyncStatus.SUCCESS;
        syncRecord.veracoreOrderId = result.veracoreOrderId;
        syncRecord.errorMessage = undefined;
        syncRecord.lastSuccessfulSync = new Date();
        syncRecord.syncMetadata = {
          veracoreResponse: result,
          requestPayload: orderData,
        };
        this.logger.log(`Successfully synced order ${order.code} to VeraCore`);
      } else {
        syncRecord.syncStatus = SyncStatus.ERROR;
        syncRecord.errorMessage = result.error || 'Unknown error';
        syncRecord.retryCount = (syncRecord.retryCount || 0) + 1;
        this.logger.error(`Failed to sync order ${order.code} to VeraCore: ${result.error}`);
      }

      await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).save(syncRecord);

    } catch (error) {
      this.logger.error(`Error syncing order ${orderId}`, error);
      
      // Update sync record with error
      try {
        const syncRecord = await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).findOne({
          where: { vendureOrderId: orderId },
        });

        if (syncRecord) {
          syncRecord.syncStatus = SyncStatus.ERROR;
          syncRecord.errorMessage = error instanceof Error ? error.message : String(error);
          syncRecord.lastSyncAttempt = new Date();
          syncRecord.retryCount = (syncRecord.retryCount || 0) + 1;
          await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).save(syncRecord);
        }
      } catch (updateError) {
        this.logger.error(`Failed to update sync record for order ${orderId}`, updateError);
      }
    }
  }

  private async mapOrderToVeraCoreFormat(ctx: RequestContext, order: Order): Promise<any> {
    const config = await this.connection.getRepository(ctx, VeraCoreConfigEntity).findOne({
      where: {},
    });

    if (!config) {
      throw new Error('VeraCore configuration not found');
    }

    return {
      CompanyId: config.companyId,
      OrderNumber: order.code,
      Customer: {
        FirstName: order.customer?.firstName || '',
        LastName: order.customer?.lastName || '',
        Email: order.customer?.emailAddress || '',
      },
      ShippingAddress: {
        Address1: order.shippingAddress?.streetLine1 || '',
        Address2: order.shippingAddress?.streetLine2 || '',
        City: order.shippingAddress?.city || '',
        State: order.shippingAddress?.province || '',
        Zip: order.shippingAddress?.postalCode || '',
        Country: order.shippingAddress?.countryCode || '',
      },
      Items: order.lines.map((line) => ({
        SKU: line.productVariant.sku,
        Quantity: line.quantity,
        UnitPrice: line.unitPriceWithTax / 100, // Convert from cents to dollars
      })),
    };
  }

  async retrySyncOrder(ctx: RequestContext, vendureOrderId: string): Promise<boolean> {
    this.logger.log(`Retrying sync for order ${vendureOrderId}`);
    await this.syncOrder(ctx, vendureOrderId);
    
    // Check if retry was successful
    const syncRecord = await this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).findOne({
      where: { vendureOrderId },
    });

    return syncRecord?.syncStatus === SyncStatus.SUCCESS;
  }

  async getSyncStatus(ctx: RequestContext, vendureOrderId: string): Promise<VeraCoreOrderSyncEntity | null> {
    return this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).findOne({
      where: { vendureOrderId },
    });
  }

  async getAllFailedSyncs(ctx: RequestContext): Promise<VeraCoreOrderSyncEntity[]> {
    return this.connection.getRepository(ctx, VeraCoreOrderSyncEntity).find({
      where: { syncStatus: SyncStatus.ERROR },
      order: { lastSyncAttempt: 'DESC' },
    });
  }

  async getSyncStats(ctx: RequestContext): Promise<{
    totalSynced: number;
    totalFailed: number;
    totalPending: number;
    recentErrors: VeraCoreOrderSyncEntity[];
  }> {
    const repo = this.connection.getRepository(ctx, VeraCoreOrderSyncEntity);
    
    const [totalSynced, totalFailed, totalPending, recentErrors] = await Promise.all([
      repo.count({ where: { syncStatus: SyncStatus.SUCCESS } }),
      repo.count({ where: { syncStatus: SyncStatus.ERROR } }),
      repo.count({ where: { syncStatus: SyncStatus.PENDING } }),
      repo.find({
        where: { syncStatus: SyncStatus.ERROR },
        order: { lastSyncAttempt: 'DESC' },
        take: 10,
      }),
    ]);

    return {
      totalSynced,
      totalFailed,
      totalPending,
      recentErrors,
    };
  }
}
