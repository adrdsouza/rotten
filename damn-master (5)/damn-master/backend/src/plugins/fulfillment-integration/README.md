# VeraCore Integration Plugin

A comprehensive Vendure plugin for integrating with VeraCore's fulfillment API. This plugin provides:

- **Order Synchronization**: Automatically sync orders to VeraCore when they reach specified states
- **Inventory Synchronization**: Keep product stock levels in sync with VeraCore inventory
- **Tracking Updates**: Automatically update orders with tracking information from VeraCore
- **Webhook Support**: Real-time updates via VeraCore webhooks
- **Admin UI**: GraphQL API extensions for managing sync status and configuration

## Installation

1. The plugin is already installed in your Vendure project at `backend/src/plugins/veracore-integration/`

2. Add the plugin to your Vendure configuration:

```typescript
// backend/src/vendure-config.ts
import { VeraCoreIntegrationPlugin } from './plugins/veracore-integration';

export const config: VendureConfig = {
  // ... other config
  plugins: [
    // ... other plugins
    VeraCoreIntegrationPlugin.init({
      apiUrl: 'https://api.veracore.com/v1', // Your VeraCore API URL
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      companyId: 'your-company-id',
      syncInventoryIntervalMinutes: 30, // Optional: default 30 minutes
      syncTrackingIntervalMinutes: 15,  // Optional: default 15 minutes
      orderSyncTriggerStates: ['PaymentSettled'], // Optional: default ['PaymentSettled']
      webhookSecret: 'your-webhook-secret', // Optional: for webhook verification
    }),
  ],
};
```

## Configuration

### Required Credentials

You'll need to obtain the following from VeraCore:

- **API URL**: The base URL for VeraCore's API
- **Client ID**: Your API client identifier
- **Client Secret**: Your API client secret
- **Company ID**: Your unique company identifier in VeraCore

### Environment Variables (Recommended)

Instead of hardcoding credentials, use environment variables:

```typescript
VeraCoreIntegrationPlugin.init({
  apiUrl: process.env.VERACORE_API_URL!,
  clientId: process.env.VERACORE_CLIENT_ID!,
  clientSecret: process.env.VERACORE_CLIENT_SECRET!,
  companyId: process.env.VERACORE_COMPANY_ID!,
  webhookSecret: process.env.VERACORE_WEBHOOK_SECRET,
}),
```

Add to your `.env` file:
```
VERACORE_API_URL=https://api.veracore.com/v1
VERACORE_CLIENT_ID=your-client-id
VERACORE_CLIENT_SECRET=your-client-secret
VERACORE_COMPANY_ID=your-company-id
VERACORE_WEBHOOK_SECRET=your-webhook-secret
```

## Database Migration

After adding the plugin, generate and run a migration:

```bash
cd backend
npx vendure migrate generate veracore-integration
npx vendure migrate run
```

## Features

### Order Synchronization

- Automatically syncs orders to VeraCore when they transition to specified states
- Default trigger: `PaymentSettled` state
- Includes customer information, shipping address, and line items
- Tracks sync status and provides retry functionality
- Exponential backoff retry logic for failed syncs

### Inventory Synchronization

- Scheduled sync every 30 minutes (configurable)
- Updates Vendure product variant stock levels from VeraCore
- Supports both full inventory sync and single SKU sync
- Handles stock adjustments automatically

### Tracking Updates

- Scheduled sync every 15 minutes (configurable)
- Updates orders with tracking numbers from VeraCore
- Automatically transitions orders to 'Shipped' state when appropriate
- Emits events for tracking updates (useful for notifications)

### Webhook Support

The plugin provides webhook endpoints for real-time updates:

- `/veracore-webhooks/inventory-update` - Inventory changes
- `/veracore-webhooks/order-update` - Order status changes
- `/veracore-webhooks/tracking-update` - Tracking information updates

Configure these URLs in your VeraCore dashboard to receive real-time updates.

## Admin API

The plugin extends the Admin API with the following queries and mutations:

### Queries

```graphql
# Get sync status for a specific order
veracoreOrderSyncStatus(orderId: String!): VeraCoreOrderSyncStatus

# Get overall sync statistics
veracoreOrderSyncStats: VeraCoreOrderSyncStats!

# Get failed order syncs
veracoreFailedOrderSyncs: [VeraCoreOrderSyncStatus!]!

# Get inventory sync statistics
veracoreInventorySyncStats: VeraCoreInventorySyncStats!

# Get tracking sync statistics
veracoreTrackingSyncStats: VeraCoreTrackingSyncStats!
```

### Mutations

```graphql
# Retry a failed order sync
retryVeracoreOrderSync(orderId: String!): VeraCoreSimpleResult!

# Force a full inventory sync
forceVeracoreInventorySync: VeraCoreOperationResult!

# Sync inventory for a specific SKU
syncVeracoreInventoryForSku(sku: String!): VeraCoreSimpleResult!

# Force a tracking sync
forceVeracoreTrackingSync: VeraCoreOperationResult!

# Sync tracking for a specific order
syncVeracoreTrackingForOrder(orderId: String!): VeraCoreSimpleResult!
```

## Error Handling

The plugin includes comprehensive error handling:

- **Exponential Backoff**: Automatic retry with increasing delays
- **Circuit Breaker**: Prevents cascading failures
- **Error Categorization**: Distinguishes between retryable and non-retryable errors
- **Comprehensive Logging**: Detailed logs for debugging and monitoring

## Monitoring

Monitor the plugin through:

- **Admin API**: Use the GraphQL queries to check sync status
- **Logs**: Check Vendure logs for sync activities and errors
- **Database**: Query the `veracore_order_sync` and `veracore_config` tables

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Verify your API credentials
2. **Network Timeouts**: Check your network connection to VeraCore
3. **SKU Mismatches**: Ensure product SKUs match between Vendure and VeraCore
4. **Webhook Verification**: Ensure webhook secret is correctly configured

### Debug Mode

Enable debug logging by setting the log level to 'debug' in your Vendure configuration.

## Security Considerations

- Store API credentials as environment variables
- Use HTTPS for all webhook endpoints
- Verify webhook signatures to prevent unauthorized requests
- Regularly rotate API credentials
- Monitor API usage and rate limits

## Support

For issues related to:
- **Plugin functionality**: Check the logs and Admin API for sync status
- **VeraCore API**: Consult VeraCore's API documentation
- **Vendure integration**: Refer to Vendure's plugin development guide
