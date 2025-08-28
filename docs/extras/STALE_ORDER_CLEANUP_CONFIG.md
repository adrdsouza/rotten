# Stale Order Cleanup Service Configuration

The StaleOrderCleanupService handles automatic cleanup of stale and cancelled orders to keep the database clean and prevent checkout issues.

## Features

### 1. Stale Order Cleanup (Default)
- **Purpose**: Cancels orders stuck in `ArrangingPayment`, `AddingItems`, or `PaymentAuthorized` states
- **Schedule**: Runs every hour by default
- **Age Threshold**: Orders older than 60 minutes (configurable)
- **Status**: Always enabled

### 2. Cancelled Order Deletion (Optional)
- **Purpose**: Permanently deletes cancelled orders that have no refunds
- **Schedule**: Runs with stale order cleanup (hourly)
- **Age Threshold**: Orders older than 7 days (configurable)
- **Status**: Disabled by default (must be explicitly enabled)

## Environment Variables

### Stale Order Cleanup
```bash
# Cron schedule for cleanup (default: every hour)
ORDER_CLEANUP_CRON="0 * * * *"

# Maximum age in minutes for stale orders (default: 30)
ORDER_CLEANUP_MAX_AGE_MINUTES=30

# Batch size for processing (default: 100)
ORDER_CLEANUP_BATCH_SIZE=100

# Maximum pages to process (default: 100)
ORDER_CLEANUP_MAX_PAGES=100

# Run cleanup on application startup (default: false)
ORDER_CLEANUP_RUN_ON_STARTUP=false
```

### Cancelled Order Deletion
```bash
# Enable deletion of cancelled orders without refunds (default: false)
ORDER_DELETE_CANCELLED_ENABLED=true

# Minimum age in days for cancelled orders to be deleted (default: 7)
ORDER_DELETE_CANCELLED_MIN_AGE_DAYS=7
```

## Safety Features

### Cancelled Order Deletion Safety
- ✅ **Only deletes orders WITHOUT refunds** (preserves financial integrity)
- ✅ **Age-based filtering** (only deletes old orders)
- ✅ **Transaction-based** (all-or-nothing deletion)
- ✅ **Foreign key handling** (deletes related data in correct order)
- ✅ **Comprehensive logging** (tracks all operations)
- ✅ **Error handling** (automatic rollback on failure)

### What Gets Deleted
When a cancelled order without refunds is deleted, the following related data is also removed:
- Stock movements
- History entries
- Order channel relationships
- Order fulfillment relationships
- Order lines
- Order modifications
- Order promotion relationships
- Payments (safe since no refunds exist)
- Shipping lines
- Surcharges

### What Gets Updated (Not Deleted)
- Sessions: `activeOrderId` set to NULL
- Self-referencing orders: `aggregateOrderId` set to NULL

## Usage Examples

### Enable Cancelled Order Deletion
Add to your environment variables:
```bash
ORDER_DELETE_CANCELLED_ENABLED=true
ORDER_DELETE_CANCELLED_MIN_AGE_DAYS=14  # Delete orders older than 14 days
```

### Manual Cleanup (via code)
```typescript
// Inject the service
constructor(private staleOrderCleanupService: StaleOrderCleanupService) {}

// Manually trigger stale order cleanup
const cancelledCount = await this.staleOrderCleanupService.triggerManualCleanup(60); // 60 minutes

// Manually trigger cancelled order deletion
const deletedCount = await this.staleOrderCleanupService.triggerManualCancelledOrderDeletion(30); // 30 days
```

## Monitoring

### Log Messages
The service provides detailed logging for monitoring:

```
# Stale order cleanup
[StaleOrderCleanupService] Starting scheduled stale order cleanup (maxAge: 30 minutes)
[StaleOrderCleanupService] No stale orders found to clean up

# Cancelled order deletion (when enabled)
[StaleOrderCleanupService] Found 4 cancelled orders without refunds to delete (older than 7 days)
[StaleOrderCleanupService] Successfully deleted 4 cancelled orders without refunds
```

### Service Initialization
```
[StaleOrderCleanupService] Stale order cleanup service initialized - cron schedule: 0 * * * *, max age: 30 minutes, batch size: 100, max pages: 100, cancelled order deletion: enabled
```

## Recommendations

### Production Settings
```bash
# Conservative settings for production
ORDER_CLEANUP_CRON="0 2 * * *"              # Run at 2 AM daily instead of hourly
ORDER_CLEANUP_MAX_AGE_MINUTES=60             # 1 hour for stale orders
ORDER_DELETE_CANCELLED_ENABLED=true          # Enable cancelled order cleanup
ORDER_DELETE_CANCELLED_MIN_AGE_DAYS=30       # Keep cancelled orders for 30 days
ORDER_CLEANUP_BATCH_SIZE=50                  # Smaller batches for production
```

### Development Settings
```bash
# More aggressive settings for development
ORDER_CLEANUP_CRON="*/15 * * * *"           # Every 15 minutes
ORDER_CLEANUP_MAX_AGE_MINUTES=5             # 5 minutes for stale orders
ORDER_DELETE_CANCELLED_ENABLED=true         # Enable for testing
ORDER_DELETE_CANCELLED_MIN_AGE_DAYS=1       # Delete after 1 day
ORDER_CLEANUP_RUN_ON_STARTUP=true           # Run on startup
```

## Database Impact

### Performance Considerations
- Uses batched processing to avoid large transactions
- Includes pagination limits to prevent runaway queries
- Runs during low-traffic hours (configurable)
- Uses proper indexes for efficient queries

### Storage Benefits
- Reduces database size by removing unnecessary data
- Improves query performance by reducing table sizes
- Prevents accumulation of test/abandoned orders

---

*Last updated: July 2025*
*Service location: `/backend/src/services/stale-order-cleanup.service.ts`*
