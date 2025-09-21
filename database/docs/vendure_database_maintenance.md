# My Database Maintenance Guide

This is my personal reference for maintaining my Vendure shop's database, with a focus on safely managing and deleting orders when needed.

## Table of Contents
1. [Order Structure and Dependencies](#order-structure-and-dependencies)
2. [Cancelled Orders Cleanup](#cancelled-orders-cleanup)
3. [Historical Cleanup Operations](#historical-cleanup-operations)
4. [Available Scripts](#available-scripts)

## Order Structure and Dependencies

The following tables have foreign key relationships with the `order` table and require careful handling when deleting orders:

1. `stock_movement` (references `order_line.id`) - **Must be deleted first**
2. `history_entry` (orderId)
3. `order_channels_channel` (orderId)
4. `order_fulfillments_fulfillment` (orderId)
5. `order_line` (orderId)
6. `order_modification` (orderId)
7. `order_promotions_promotion` (orderId)
8. `payment` (orderId)
9. `shipping_line` (orderId)
10. `surcharge` (orderId)
11. `session` (activeOrderId) - **Update to NULL, don't delete**
12. `order` (aggregateOrderId) - **Self-reference, update to NULL**

## Cancelled Orders Cleanup

### Available Scripts

There are two main SQL scripts for managing cancelled orders:

1. **`dry_run_delete_cancelled_and_adding.sql`** - Analyzes what would be deleted without making any changes
2. **`delete_cancelled_and_adding_orders_fixed.sql`** - Performs the actual deletion of cancelled orders

### How to Run the Scripts

#### Step 1: Run the Dry Run Script

This will show what would be deleted without making any changes:

```bash
cd /home/vendure/database_analysis
sudo -u postgres psql -d vendure_db -f dry_run_delete_cancelled_and_adding.sql
```

#### Step 2: Run the Deletion Script

After confirming the dry run results, run the actual deletion script:

```bash
cd /home/vendure/database_analysis
sudo -u postgres psql -d vendure_db -f delete_cancelled_and_adding_orders_fixed.sql
```

### What the Scripts Do

#### Dry Run Script (`dry_run_delete_cancelled_and_adding.sql`)
- Identifies cancelled orders that would be deleted
- Shows related data that would be deleted (history entries, stock movements, etc.)
- Lists sessions that would be updated
- Provides a summary of the total impact

#### Deletion Script (`delete_cancelled_and_adding_orders_fixed.sql`)
- Excludes orders with refunds to avoid foreign key constraint violations
- Deletes related data in the correct order to maintain referential integrity
- Updates sessions to remove references to deleted orders
- Updates order aggregates if needed
- Provides verification that all targeted orders were deleted

### Important Notes

1. Orders with refunds will **not** be deleted by these scripts to avoid foreign key constraint violations
2. The scripts are designed to be safe and maintain database integrity
3. Always run the dry run script first to understand what will be deleted
4. These scripts can be run periodically to clean up empty or cancelled orders

## Historical Cleanup Operations

### Major Cleanup (June 2025)

**Database:** vendure_db  
**Environment:** Production Ready ✅

#### Backup Files Created:
- **SQL Dump:** `backup_tables_dump_20250612_112100.sql` (2.0 MB)
  - Contains all deleted order data for recovery if needed

#### Data Removed:
- **244 orders** (non-completed states)
  - 205 Cancelled orders
  - 38 PaymentSettled orders  
  - 1 Shipped order
- **All related data** (1,436 total records)

### Recent Cleanup Operations (July 10, 2025)

We've performed two rounds of cleanup for cancelled orders:

**First Cleanup:**
- Successfully deleted 5 out of 9 cancelled orders from the database
- The remaining 4 cancelled orders were not deleted because they have refunds associated with them

**Second Cleanup (Later the same day):**
- Successfully deleted 3 out of 8 cancelled orders
- These included the most recent empty orders (DD29397, DD29398, DD29399)
- 5 cancelled orders remain (these have refunds)

#### Root Cause Fix:
The health monitoring script was modified to use safe, non-mutating GraphQL queries instead of direct POST requests, which should prevent the creation of new empty orders in the future.

## Preventing Empty Orders

To prevent empty orders from being created by monitoring scripts or health checks, we've implemented:

1. Updated health monitoring script to use safe GraphQL queries
2. Enhanced order creation logging to track the source of empty orders
3. Created middleware to block empty order creation from monitoring requests

These measures together should prevent the creation of unwanted empty orders while still allowing legitimate orders to be created.

## My SQL Scripts

### Scripts I Use Regularly:

1. **Order Cancellation**
   - `cancel_order_13074.sql` - The script I used for order 13074 (can be modified for other orders)

2. **Cleanup Scripts**
   - `dry_run_delete_cancelled_and_adding.sql` - I use this to check what would be deleted
   - `delete_cancelled_and_adding_orders_fixed.sql` - For actually removing cancelled orders

3. **Analysis Scripts**
   - `order_analysis_queries.sql` - My general analysis queries
   - `order_structure_analysis.sql` - For checking database structure
   - `shop_performance_indexes.sql` - For checking index performance

4. **Export Scripts**
   - `export_orders_single_file.sql` - For exporting orders to CSV
