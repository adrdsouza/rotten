import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { 
  RequestContext, 
  ProductVariantService, 
  StockLevelService,
  TransactionalConnection,
} from '@vendure/core';
import { VeraCoreApiService } from './veracore-api.service';
import { VeraCoreConfigEntity } from '../entities/veracore-config.entity';

interface InventorySyncResult {
  totalProcessed: number;
  updated: number;
  errors: number;
  skipped: number;
}

@Injectable()
export class InventorySyncService {
  private readonly logger = new Logger(InventorySyncService.name);
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  constructor(
    private veracoreApiService: VeraCoreApiService,
    private productVariantService: ProductVariantService,
    private stockLevelService: StockLevelService,
    private connection: TransactionalConnection,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async scheduledInventorySync(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Inventory sync already running, skipping scheduled sync');
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

    await this.syncInventory(ctx);
  }

  async syncInventory(ctx: RequestContext, force = false): Promise<InventorySyncResult> {
    if (this.isRunning && !force) {
      throw new Error('Inventory sync is already running');
    }

    this.isRunning = true;
    const startTime = new Date();
    
    this.logger.log('Starting inventory synchronization from VeraCore');

    const result: InventorySyncResult = {
      totalProcessed: 0,
      updated: 0,
      errors: 0,
      skipped: 0,
    };

    try {
      // Fetch all inventory from VeraCore
      const veracoreInventory = await this.veracoreApiService.getInventory(ctx);
      
      if (veracoreInventory.length === 0) {
        this.logger.warn('No inventory data received from VeraCore');
        return result;
      }

      this.logger.log(`Processing ${veracoreInventory.length} inventory items from VeraCore`);

      // Process each inventory item
      for (const inventoryItem of veracoreInventory) {
        result.totalProcessed++;
        
        try {
          const updated = await this.updateProductVariantStock(ctx, inventoryItem);
          if (updated) {
            result.updated++;
          } else {
            result.skipped++;
          }
        } catch (error) {
          this.logger.error(`Failed to update stock for SKU ${inventoryItem.SKU}`, error);
          result.errors++;
        }
      }

      this.lastSyncTime = new Date();
      
      // Update config with last sync time
      const config = await this.connection.getRepository(ctx, VeraCoreConfigEntity).findOne({
        where: {},
      });
      if (config) {
        config.lastInventorySync = this.lastSyncTime;
        await this.connection.getRepository(ctx, VeraCoreConfigEntity).save(config);
      }

      const duration = this.lastSyncTime.getTime() - startTime.getTime();
      
      this.logger.log(`Inventory sync completed in ${duration}ms`, {
        ...result,
        duration,
      });

    } catch (error) {
      this.logger.error('Inventory sync failed', error);
      throw error;
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  private async updateProductVariantStock(ctx: RequestContext, inventoryItem: any): Promise<boolean> {
    // Find product variant by SKU
    const variants = await this.productVariantService.findAll(ctx, {
      filter: { sku: { eq: inventoryItem.SKU } },
    });

    if (variants.totalItems === 0) {
      this.logger.warn(`No product variant found for SKU: ${inventoryItem.SKU}`);
      return false;
    }

    if (variants.totalItems > 1) {
      this.logger.warn(`Multiple variants found for SKU: ${inventoryItem.SKU}, using first one`);
    }

    const variant = variants.items[0];
    const newStockLevel = Math.max(0, inventoryItem.AvailableQuantity || 0);

    // Get current stock levels
    const stockLevels = await this.stockLevelService.getAvailableStock(ctx, variant.id);

    // Calculate current stock - stockLevels is a single object, not an array
    const currentStock = typeof stockLevels === 'object' && stockLevels !== null
      ? (stockLevels as any).stockOnHand || 0
      : 0;

    // Only update if stock level has changed
    if (currentStock !== newStockLevel) {
      const adjustment = newStockLevel - currentStock;

      // Use default stock location
      const stockLocationId = 'default';
      
      await this.stockLevelService.updateStockOnHandForLocation(
        ctx,
        variant.id,
        stockLocationId,
        adjustment
      );

      this.logger.debug(`Updated stock for SKU ${inventoryItem.SKU}: ${currentStock} → ${newStockLevel}`);
      return true;
    }

    return false;
  }

  async syncSingleSku(ctx: RequestContext, sku: string): Promise<boolean> {
    this.logger.log(`Syncing inventory for single SKU: ${sku}`);
    
    try {
      const inventoryData = await this.veracoreApiService.getInventory(ctx, sku);
      
      if (inventoryData.length === 0) {
        this.logger.warn(`No inventory data found for SKU: ${sku}`);
        return false;
      }

      const updated = await this.updateProductVariantStock(ctx, inventoryData[0]);
      if (updated) {
        this.logger.log(`Successfully synced inventory for SKU: ${sku}`);
      } else {
        this.logger.log(`No changes needed for SKU: ${sku}`);
      }
      return updated;
    } catch (error) {
      this.logger.error(`Failed to sync inventory for SKU: ${sku}`, error);
      return false;
    }
  }

  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  isCurrentlyRunning(): boolean {
    return this.isRunning;
  }

  async forceSync(ctx: RequestContext): Promise<InventorySyncResult> {
    this.logger.log('Force starting inventory synchronization');
    return await this.syncInventory(ctx, true);
  }
}
