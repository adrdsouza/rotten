import {
  PluginCommonModule,
  VendurePlugin,
  EventBus,
  JobQueueService,
  JobQueue,
  RequestContext,
  OrderStateTransitionEvent,
  TransactionalConnection,
} from '@vendure/core';
import { OnApplicationBootstrap } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { VeraCoreApiService } from './services/veracore-api.service';
import { InventorySyncService } from './services/inventory-sync.service';
import { TrackingSyncService } from './services/tracking-sync.service';
import { OrderSyncService } from './services/order-sync.service';
import { ErrorHandlerService } from './services/error-handler.service';

// Entities
import { VeraCoreConfigEntity } from './entities/veracore-config.entity';
import { VeraCoreOrderSyncEntity } from './entities/veracore-order-sync.entity';

// API
import { VeraCoreAdminResolver, veracoreAdminApiExtensions } from './api/veracore-admin.resolver';

export interface VeraCorePluginOptions {
  apiUrl: string;
  clientId: string;
  clientSecret: string;
  companyId: string;
  syncInventoryIntervalMinutes?: number;
  syncTrackingIntervalMinutes?: number;
  orderSyncTriggerStates?: string[];
}

@VendurePlugin({
  imports: [PluginCommonModule, ScheduleModule.forRoot()],
  providers: [
    ErrorHandlerService,
    VeraCoreApiService,
    InventorySyncService,
    TrackingSyncService,
    OrderSyncService,
    VeraCoreAdminResolver,
  ],
  controllers: [],
  entities: [VeraCoreConfigEntity, VeraCoreOrderSyncEntity],
  adminApiExtensions: {
    schema: veracoreAdminApiExtensions,
    resolvers: [VeraCoreAdminResolver],
  },
  configuration: config => {
    // Add any custom fields if needed
    return config;
  },
  compatibility: '^3.0.0',
})
export class FulfillmentIntegrationPlugin implements OnApplicationBootstrap {
  private static options: VeraCorePluginOptions;
  private orderSyncQueue: JobQueue<{ orderId: string }>;
  private inventorySyncQueue: JobQueue<{ force?: boolean }>;

  constructor(
    private eventBus: EventBus,
    private jobQueueService: JobQueueService,
    private connection: TransactionalConnection,
    private orderSyncService: OrderSyncService,
    private inventorySyncService: InventorySyncService,
    private trackingSyncService: TrackingSyncService,
  ) {}

  static init(options: VeraCorePluginOptions): typeof FulfillmentIntegrationPlugin {
    this.options = options;
    return FulfillmentIntegrationPlugin;
  }

  static get config(): VeraCorePluginOptions {
    return this.options;
  }

  async onApplicationBootstrap(): Promise<void> {
    // Initialize configuration in database
    await this.initializeConfiguration();

    // Initialize job queues
    this.orderSyncQueue = await this.jobQueueService.createQueue({
      name: 'veracore-order-sync',
      process: async (job) => {
        const { orderId } = job.data;
        const ctx = RequestContext.empty();
        await this.orderSyncService.syncOrder(ctx, orderId);
      },
    });

    this.inventorySyncQueue = await this.jobQueueService.createQueue({
      name: 'veracore-inventory-sync',
      process: async (job) => {
        const ctx = RequestContext.empty();
        await this.inventorySyncService.syncInventory(ctx, job.data.force);
      },
    });

    // Set up event listeners
    await this.setupEventListeners();
  }

  private async initializeConfiguration(): Promise<void> {
    const ctx = RequestContext.empty();

    // Check if configuration already exists
    const existingConfig = await this.connection
      .getRepository(ctx, VeraCoreConfigEntity)
      .findOne({ where: {} });

    if (!existingConfig && FulfillmentIntegrationPlugin.options) {
      // Create initial configuration from plugin options
      const config = new VeraCoreConfigEntity({
        apiUrl: FulfillmentIntegrationPlugin.options.apiUrl,
        clientId: FulfillmentIntegrationPlugin.options.clientId,
        clientSecret: FulfillmentIntegrationPlugin.options.clientSecret,
        companyId: FulfillmentIntegrationPlugin.options.companyId,
        inventorySyncIntervalMinutes: FulfillmentIntegrationPlugin.options.syncInventoryIntervalMinutes || 1440, // Daily
        trackingSyncIntervalMinutes: FulfillmentIntegrationPlugin.options.syncTrackingIntervalMinutes || 30, // Every 30 min during business hours
        orderSyncTriggerStates: FulfillmentIntegrationPlugin.options.orderSyncTriggerStates || ['PaymentSettled'],
        syncEnabled: true,
      });

      await this.connection
        .getRepository(ctx, VeraCoreConfigEntity)
        .save(config);
    }
  }

  private async setupEventListeners(): Promise<void> {
    const ctx = RequestContext.empty();

    // Get trigger states from configuration
    const config = await this.connection
      .getRepository(ctx, VeraCoreConfigEntity)
      .findOne({ where: {} });

    const triggerStates = config?.orderSyncTriggerStates || ['PaymentSettled'];

    this.eventBus.ofType(OrderStateTransitionEvent).subscribe(async (event) => {
      if (triggerStates.includes(event.toState)) {
        await this.orderSyncQueue.add({
          orderId: String(event.order.id),
        });
      }
    });
  }
}
