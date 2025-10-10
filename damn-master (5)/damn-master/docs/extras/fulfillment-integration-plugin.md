# Fulfillment Integration Plugin

A comprehensive Vendure plugin for integrating with fulfillment providers like VeraCore. This plugin provides automated order synchronization, inventory management, tracking updates, and real-time webhook support.

## 🎯 Features

### Core Functionality
- **Automated Order Sync** - Orders automatically sync to fulfillment provider when they reach specified states
- **Real-time Inventory Updates** - Stock levels sync from fulfillment provider to prevent overselling
- **Tracking Information** - Automatic tracking number updates with carrier information
- **Scheduled Polling** - Regular API calls to sync data with fulfillment provider
- **Admin GraphQL API** - Monitor sync status and manually trigger synchronizations
- **Comprehensive Error Handling** - Exponential backoff retry logic with detailed logging

### Sync Strategy
The plugin uses **scheduled polling** to sync data with VeraCore:

1. **Order Sync** - Orders pushed to VeraCore when they reach specified states
2. **Inventory Sync** - Stock levels pulled from VeraCore daily (for manual adjustments, returns, new stock)
3. **Tracking Sync** - Tracking information pulled from VeraCore during business hours (every 30 minutes, 9 AM-7 PM LA time, Mon-Fri)

**Note**: VeraCore does not provide webhook support, so all synchronization is API-driven with scheduled polling.

## 📋 Requirements

- Vendure 3.3.5+
- PostgreSQL database
- Node.js 18+
- Fulfillment provider API credentials (VeraCore supported)

## 🚀 Installation

### 1. Database Setup

The plugin automatically creates required database tables:
- `veracore_config` - Stores API credentials and configuration
- `veracore_order_sync` - Tracks order synchronization status

### 2. Environment Variables

Add to your `.env` file:

```bash
# VeraCore API Configuration
VERACORE_API_URL=https://api.veracore.com/v1
VERACORE_CLIENT_ID=your-client-id
VERACORE_CLIENT_SECRET=your-client-secret
VERACORE_COMPANY_ID=your-company-id

```

### 3. Plugin Configuration

Add to your `vendure-config.ts`:

```typescript
import { FulfillmentIntegrationPlugin } from './plugins/fulfillment-integration';

export const config: VendureConfig = {
  plugins: [
    // ... other plugins
    FulfillmentIntegrationPlugin.init({
      apiUrl: process.env.VERACORE_API_URL || 'https://api.veracore.com/v1',
      clientId: process.env.VERACORE_CLIENT_ID!,
      clientSecret: process.env.VERACORE_CLIENT_SECRET!,
      companyId: process.env.VERACORE_COMPANY_ID!,
      syncInventoryIntervalMinutes: 1440,      // Daily inventory sync (24 hours)
      syncTrackingIntervalMinutes: 30,         // Tracking sync during business hours
      orderSyncTriggerStates: ['PaymentSettled'], // Order states that trigger sync

    }),
  ],
};
```

## ⚙️ Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiUrl` | string | Required | Fulfillment provider API endpoint |
| `clientId` | string | Required | API client ID |
| `clientSecret` | string | Required | API client secret |
| `companyId` | string | Required | Your company ID in the fulfillment system |
| `syncInventoryIntervalMinutes` | number | 1440 | How often to sync inventory (minutes, 1440 = daily) |
| `syncTrackingIntervalMinutes` | number | 30 | How often to sync tracking during business hours |
| `orderSyncTriggerStates` | string[] | ['PaymentSettled'] | Order states that trigger sync |


## 🔄 How It Works

### Order Synchronization Flow

1. **Order State Change** - Customer order reaches `PaymentSettled` state
2. **Queue Job** - Order sync job added to background queue
3. **API Call** - Order data sent to fulfillment provider
4. **Status Tracking** - Sync status recorded in database
5. **Retry Logic** - Failed syncs automatically retried with exponential backoff

### Inventory Synchronization

1. **Daily Sync** - Runs once daily at 2 AM (configurable)
2. **API Polling** - Calls VeraCore's inventory web service to get current stock levels
3. **Stock Level Updates** - Vendure product variants updated with current stock
4. **SKU Matching** - Products matched between systems using SKU/product codes

**Why Daily Instead of Frequent?**
- **Vendure manages order stock** - No need to sync for every order
- **Real inventory changes** are infrequent (new stock, returns, damage, manual adjustments)
- **Reduces API load** and system overhead
- **Manual sync available** via admin API for immediate updates when needed

### Tracking Updates

1. **Business Hours Polling** - Checks for new tracking every 30 minutes during LA business hours (9 AM-7 PM, Mon-Fri)
2. **API Queries** - Calls VeraCore's shipment web service for tracking updates
3. **Customer Notifications** - Tracking info added to order custom fields
4. **Carrier Information** - Includes tracking number, carrier, and ship date

**Why Business Hours Only?**
- **Fulfillment happens during business hours** - No point checking nights/weekends
- **Reduces unnecessary API calls** - 70% fewer API calls vs 24/7 polling
- **Still responsive** - 30-minute updates during active fulfillment hours
- **Manual sync available** - Admin can force sync anytime if needed

## 🔌 VeraCore API Integration

The plugin integrates with VeraCore's SOAP/REST web services for data synchronization:

### Authentication

VeraCore uses standard authentication methods:

**HTTP Basic Auth** (Username/Password):
```http
Authorization: Basic <base64(username:password)>
```

**OAuth 2.0** (Client Credentials):
```http
Authorization: Bearer <access_token>
```

### Core API Endpoints

#### Order Submission
```
POST /api/orders
```
Pushes new orders to VeraCore when they reach the configured state (e.g., PaymentSettled).

#### Inventory Retrieval
```
GET /api/inventory
GET /api/inventory/{sku}  # Single SKU lookup
```
Pulls current stock levels for all products. Called every 30 minutes by default.

**Response Format:**
```json
{
  "SKU": "PRODUCT-123",
  "AvailableQuantity": 45,    // Available for sale (what we use for stock)
  "ReservedQuantity": 5,      // Reserved for pending orders
  "OnHandQuantity": 50        // Total physical inventory
}
```

**Stock Calculation:**
- **AvailableQuantity** = OnHandQuantity - ReservedQuantity
- **This is what we sync to Vendure** as the sellable stock level
- **ReservedQuantity** includes orders that have been sent to VeraCore but not yet shipped

#### Shipment/Tracking Retrieval
```
GET /api/shipments
```
Retrieves shipment and tracking information for orders. Called every 15 minutes by default.

### API Data Flow

1. **Outbound (Push to VeraCore)**:
   - Order data when orders reach specified states
   - Customer information and shipping addresses

2. **Inbound (Pull from VeraCore)**:
   - Current inventory levels by SKU
   - Shipment status and tracking numbers
   - Order fulfillment status updates

### Order-Inventory Relationship

**How Orders Affect Inventory:**

1. **Order Placed in Vendure** → **Vendure immediately reserves stock** (no VeraCore sync needed)
2. **Order Synced to VeraCore** → VeraCore tracks the order but **Vendure already handled stock**
3. **Order Ships** → VeraCore updates its records, **Vendure stock unchanged** (already reserved)
4. **Daily Inventory Sync** → Syncs any **manual adjustments, returns, or new stock** from VeraCore

**Timeline Example:**
```
Order Placed:    Vendure=98 (reserved immediately), VeraCore=100
Order Synced:    Vendure=98 (no change), VeraCore=100 (tracks order)
Order Ships:     Vendure=98 (no change), VeraCore=98 (shipped)
Daily Sync:      Vendure=98 (no change), both systems aligned
```

**Key Points:**
- **Vendure handles order stock management** - no need for frequent VeraCore sync
- **Daily sync only for external changes** - manual adjustments, returns, new inventory
- **No overselling risk** - Vendure reserves stock immediately when orders are placed
- **VeraCore sync is for reconciliation** - not real-time order stock management

### Rate Limiting & Error Handling

- **Exponential Backoff**: Failed API calls are retried with increasing delays
- **Rate Limiting**: Respects VeraCore's API rate limits
- **Error Logging**: Comprehensive logging of all API interactions
- **Timeout Handling**: Configurable timeouts for API calls

## 📊 Admin GraphQL API

Monitor and control the plugin through GraphQL queries and mutations:

### Query Sync Status
```graphql
query {
  veraCoreOrderSyncStatus(orderCode: "ORDER-123") {
    syncStatus
    lastSyncAttempt
    errorMessage
    retryCount
  }
}
```

### Force Order Sync
```graphql
mutation {
  forceVeraCoreOrderSync(orderId: "123") {
    success
    message
  }
}
```

### Force Inventory Sync
```graphql
mutation {
  forceVeraCoreInventorySync {
    success
    syncedProducts
    errors
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Orders not syncing**
   - Check order state matches `orderSyncTriggerStates`
   - Verify API credentials are correct
   - Check job queue is processing

2. **Inventory not updating**
   - Check daily sync is running (2 AM daily)
   - Verify API credentials have inventory access
   - Confirm SKUs match between systems
   - Use manual sync via admin API for immediate updates

3. **Tracking not updating**
   - Check if it's during business hours (9 AM-7 PM LA time, Mon-Fri)
   - Verify scheduled tracking sync is running during business hours
   - Check if orders exist in VeraCore system
   - Confirm API user has shipment access permissions
   - Use manual sync via admin API for immediate updates outside business hours

4. **Inventory discrepancies**
   - **Orders not reflected**: This is normal - Vendure manages order stock, not VeraCore sync
   - **Stock differences**: Check for manual adjustments, returns, or new inventory in VeraCore
   - **Delayed updates**: Daily sync means changes may not appear until next 2 AM sync
   - **Need immediate update**: Use manual inventory sync via admin GraphQL API

5. **SKU matching issues**
   - Ensure SKUs in Vendure exactly match VeraCore item codes
   - Check for case sensitivity differences
   - Verify special characters are handled consistently
   - Review logs for "No product variant found for SKU" warnings

### Logging

The plugin provides comprehensive logging:

```bash
# View sync logs
pm2 logs admin | grep "VeraCore"

# Check specific sync status
# Use GraphQL queries in admin panel
```

## 🏗️ Architecture

### Database Schema

```sql
-- Configuration table
CREATE TABLE veracore_config (
  id SERIAL PRIMARY KEY,
  apiUrl VARCHAR(255) NOT NULL,
  clientId VARCHAR(255) NOT NULL,
  clientSecret TEXT NOT NULL,
  -- ... other config fields
);

-- Order sync tracking
CREATE TABLE veracore_order_sync (
  id SERIAL PRIMARY KEY,
  vendureOrderId VARCHAR(255) NOT NULL,
  vendureOrderCode VARCHAR(255) NOT NULL,
  syncStatus VARCHAR NOT NULL DEFAULT 'pending',
  -- ... other tracking fields
);
```

### Plugin Structure

```
fulfillment-integration/
├── api/
│   ├── veracore-admin.resolver.ts    # GraphQL API
│   └── webhook.controller.ts         # Webhook endpoints
├── entities/
│   ├── veracore-config.entity.ts     # Configuration entity
│   └── veracore-order-sync.entity.ts # Sync tracking entity
├── services/
│   ├── veracore-api.service.ts       # API client
│   ├── order-sync.service.ts         # Order synchronization
│   ├── inventory-sync.service.ts     # Inventory management
│   ├── tracking-sync.service.ts      # Tracking updates
│   └── error-handler.service.ts      # Error handling & retry logic
└── fulfillment-integration.plugin.ts # Main plugin file
```

## 🚀 Production Deployment

### Performance Considerations

1. **Job Queue** - Uses Vendure's job queue for background processing
2. **Connection Pooling** - Efficient database connection management
3. **Rate Limiting** - Respects API rate limits with exponential backoff
4. **Memory Management** - Optimized for long-running processes

### Monitoring

- **Health Checks** - Plugin status available via GraphQL
- **Metrics** - Sync success rates and error tracking
- **Alerts** - Failed sync notifications via logging

### Scaling

- **Horizontal Scaling** - Works with multiple Vendure instances
- **Queue Distribution** - Jobs distributed across worker processes
- **Database Optimization** - Indexed for high-performance queries

## 📝 Changelog

### v1.0.0 (2025-01-23)
- Initial release
- VeraCore integration support
- Dual sync strategy (webhooks + scheduled)
- Comprehensive error handling
- Admin GraphQL API
- Production-ready architecture

## 🤝 Contributing

This plugin is designed to be extensible for other fulfillment providers. To add support for a new provider:

1. Extend the API service interface
2. Implement provider-specific webhook handlers
3. Add configuration options for the new provider
4. Update documentation

## 📄 License

This plugin is part of the Damned Designs Vendure implementation and follows the same licensing terms.
