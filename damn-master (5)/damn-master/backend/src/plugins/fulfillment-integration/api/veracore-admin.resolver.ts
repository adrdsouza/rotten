import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Allow, Ctx, RequestContext, Permission } from '@vendure/core';
import { gql } from 'graphql-tag';
import { OrderSyncService } from '../services/order-sync.service.js';
import { InventorySyncService } from '../services/inventory-sync.service.js';
import { TrackingSyncService } from '../services/tracking-sync.service.js';

export const veracoreAdminApiExtensions = gql`
  type VeraCoreOrderSyncStatus {
    id: ID!
    vendureOrderId: String!
    vendureOrderCode: String!
    veracoreOrderId: String
    syncStatus: String!
    errorMessage: String
    retryCount: Int!
    lastSyncAttempt: DateTime
    lastSuccessfulSync: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type VeraCoreOrderSyncStats {
    totalSynced: Int!
    totalFailed: Int!
    totalPending: Int!
    recentErrors: [VeraCoreOrderSyncStatus!]!
  }

  type VeraCoreInventorySyncStats {
    lastSyncTime: DateTime
    isRunning: Boolean!
  }

  type VeraCoreTrackingSyncStats {
    lastSyncTime: DateTime
    isRunning: Boolean!
    totalOrdersTracked: Int!
  }

  type VeraCoreInventorySyncResult {
    totalProcessed: Int!
    updated: Int!
    errors: Int!
    skipped: Int!
  }

  type VeraCoreTrackingSyncResult {
    ordersChecked: Int!
    trackingUpdated: Int!
    errors: Int!
  }

  type VeraCoreOperationResult {
    success: Boolean!
    error: String
    result: JSON
  }

  type VeraCoreSimpleResult {
    success: Boolean!
  }

  extend type Query {
    veracoreOrderSyncStatus(orderId: String!): VeraCoreOrderSyncStatus
    veracoreOrderSyncStats: VeraCoreOrderSyncStats!
    veracoreFailedOrderSyncs: [VeraCoreOrderSyncStatus!]!
    veracoreInventorySyncStats: VeraCoreInventorySyncStats!
    veracoreTrackingSyncStats: VeraCoreTrackingSyncStats!
  }

  extend type Mutation {
    retryVeracoreOrderSync(orderId: String!): VeraCoreSimpleResult!
    forceVeracoreInventorySync: VeraCoreOperationResult!
    syncVeracoreInventoryForSku(sku: String!): VeraCoreSimpleResult!
    forceVeracoreTrackingSync: VeraCoreOperationResult!
    syncVeracoreTrackingForOrder(orderId: String!): VeraCoreSimpleResult!
  }
`;

@Resolver()
export class VeraCoreAdminResolver {
  constructor(
    private orderSyncService: OrderSyncService,
    private inventorySyncService: InventorySyncService,
    private trackingSyncService: TrackingSyncService,
  ) {}

  @Query()
  @Allow(Permission.ReadOrder)
  async veracoreOrderSyncStatus(@Ctx() ctx: RequestContext, @Args() args: { orderId: string }) {
    return this.orderSyncService.getSyncStatus(ctx, args.orderId);
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async veracoreOrderSyncStats(@Ctx() ctx: RequestContext) {
    return this.orderSyncService.getSyncStats(ctx);
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async veracoreFailedOrderSyncs(@Ctx() ctx: RequestContext) {
    return this.orderSyncService.getAllFailedSyncs(ctx);
  }

  @Query()
  @Allow(Permission.ReadCatalog)
  async veracoreInventorySyncStats(@Ctx() _ctx: RequestContext) {
    return {
      lastSyncTime: this.inventorySyncService.getLastSyncTime(),
      isRunning: this.inventorySyncService.isCurrentlyRunning(),
    };
  }

  @Query()
  @Allow(Permission.ReadOrder)
  async veracoreTrackingSyncStats(@Ctx() ctx: RequestContext) {
    return this.trackingSyncService.getTrackingSyncStats(ctx);
  }

  @Mutation()
  @Allow(Permission.UpdateOrder)
  async retryVeracoreOrderSync(@Ctx() ctx: RequestContext, @Args() args: { orderId: string }) {
    const success = await this.orderSyncService.retrySyncOrder(ctx, args.orderId);
    return { success };
  }

  @Mutation()
  @Allow(Permission.UpdateCatalog)
  async forceVeracoreInventorySync(@Ctx() ctx: RequestContext) {
    try {
      const result = await this.inventorySyncService.forceSync(ctx);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Mutation()
  @Allow(Permission.UpdateCatalog)
  async syncVeracoreInventoryForSku(@Ctx() ctx: RequestContext, @Args() args: { sku: string }) {
    const success = await this.inventorySyncService.syncSingleSku(ctx, args.sku);
    return { success };
  }

  @Mutation()
  @Allow(Permission.UpdateOrder)
  async forceVeracoreTrackingSync(@Ctx() ctx: RequestContext) {
    try {
      const result = await this.trackingSyncService.forceTrackingSync(ctx);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Mutation()
  @Allow(Permission.UpdateOrder)
  async syncVeracoreTrackingForOrder(@Ctx() ctx: RequestContext, @Args() args: { orderId: string }) {
    const success = await this.trackingSyncService.syncTrackingForOrder(ctx, args.orderId);
    return { success };
  }
}
