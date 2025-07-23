# Bulk Tracking Update Guide

This guide provides step-by-step instructions for running bulk tracking updates on Vendure orders.

## Overview

The bulk tracking system allows you to process multiple orders at once, adding tracking codes, creating fulfillments, transitioning orders to "Shipped" state, and automatically sending email notifications to customers.

## Prerequisites

- Access to the Vendure backend server
- CSV file with tracking data in the correct format
- Orders must be in `PaymentSettled` state to be processed

## Quick Start

### 1. Prepare Your CSV File

Create a CSV file with the following format:

```csv
order code,provider,tracking code
DD29224,fedex,391013573561
DD29230,fedex,391022553325
DD29235,USPS,9434650206217052577786
```

**Required columns:**
- `order code`: The Vendure order code (e.g., DD29224)
- `provider`: Shipping method (e.g., fedex, USPS, ups)
- `tracking code`: The tracking number from the carrier

### 2. Place CSV File

Save your CSV file as `tracking.csv` in the backend/scripts directory:
```
/home/vendure/rottenhand/backend/scripts/tracking.csv
```

### 3. Run the Script

Navigate to the backend directory and run:

```bash
cd /home/vendure/rottenhand/backend
pnpm exec ts-node scripts/bulk-tracking-cli.ts
```

## Detailed Steps

### Step 1: Prepare Tracking Data

1. **Export tracking data** from your shipping provider or fulfillment service
2. **Format the CSV** with the exact column headers: `order code,provider,tracking code`
3. **Verify order codes** match your Vendure order codes exactly
4. **Check for duplicates** - each order should appear only once

### Step 2: Test with Dry Run (Recommended)

Before processing live orders, test with dry-run mode:

```bash
cd /home/vendure/rottenhand/backend
pnpm exec ts-node scripts/bulk-tracking-cli.ts --dry-run
```

This will:
- ✅ Validate your CSV format
- ✅ Check that orders exist and are in the correct state
- ✅ Show what would be processed without making changes
- ✅ Identify any potential issues

### Step 3: Run Live Update

Once you've verified the dry run results:

```bash
cd /home/vendure/rottenhand/backend
pnpm exec ts-node scripts/bulk-tracking-cli.ts
```

### Step 4: Monitor Results

The script will display:
- Progress for each order being processed
- Success/failure status for each order
- Final summary with counts and any errors
- Email notification confirmations

## Script Options

### Command Line Arguments

```bash
# Basic usage (uses default tracking.csv)
pnpm exec ts-node scripts/bulk-tracking-cli.ts

# Dry run mode (safe testing)
pnpm exec ts-node scripts/bulk-tracking-cli.ts --dry-run

# Custom CSV file
pnpm exec ts-node scripts/bulk-tracking-cli.ts --file custom-tracking.csv

# Dry run with custom file
pnpm exec ts-node scripts/bulk-tracking-cli.ts --dry-run --file custom-tracking.csv

# Help
pnpm exec ts-node scripts/bulk-tracking-cli.ts --help
```

## What the Script Does

For each order in your CSV, the script will:

1. ✅ **Find the order** and verify it's in `PaymentSettled` state
2. ✅ **Skip orders** that are already shipped
3. ✅ **Create a fulfillment** with the tracking code and shipping method
4. ✅ **Create fulfillment lines** linking the fulfillment to order line items
5. ✅ **Transition order state**: `PaymentSettled` → `PartiallyShipped` → `Shipped`
6. ✅ **Send email notification** to the customer with tracking information

## Expected Output

### Successful Processing
```
[1/11] ✅ Created fulfillment and shipped order DD29224 with method: fedex, tracking: 391013573561 📧
[2/11] ✅ Created fulfillment and shipped order DD29230 with method: fedex, tracking: 391022553325 📧

============================================================
✅ BULK TRACKING UPDATE COMPLETED
============================================================
✅ Successful updates: 11
⚠️  Skipped orders: 0
❌ Failed updates: 0
📧 Email notifications sent: 11
📊 Total processed: 11
```

### Dry Run Output
```
[1/11] 🔍 DRY RUN: Would create fulfillment for order DD29224 with method: fedex, tracking: 391013573561

============================================================
🔍 DRY RUN COMPLETED - No changes were made
============================================================
✅ Successful updates: 11
⚠️  Skipped orders: 0
❌ Failed updates: 0
```

## Troubleshooting

### Common Issues

**"Order not found"**
- Verify order codes in CSV match exactly (case-sensitive)
- Check that orders exist in the system

**"Order already shipped"**
- Order is already in `Shipped` state (this is normal, order will be skipped)

**"Cannot transition order state"**
- Order may not be in `PaymentSettled` state
- Check order status in Admin UI

**"CSV file not found"**
- Ensure `tracking.csv` is in the backend directory
- Or specify correct path with `--file` option

### Verification Steps

After running the script, verify results:

1. **Check Admin UI**: Orders should show as "Shipped" with tracking codes
2. **Check customer emails**: Customers should receive shipping notifications
3. **Database verification**: Run this query to confirm:

```sql
SELECT 
    o.code,
    o.state,
    f."trackingCode",
    f.method
FROM "order" o
JOIN order_fulfillments_fulfillment off ON o.id = off."orderId"
JOIN fulfillment f ON off."fulfillmentId" = f.id
WHERE o.code IN ('DD29224', 'DD29230', 'DD29235')
ORDER BY o.code;
```

## Best Practices

### Before Running
- ✅ **Always test with dry-run first**
- ✅ **Backup database** if processing large batches
- ✅ **Verify CSV format** and data accuracy
- ✅ **Check for duplicate tracking codes**
- ✅ **Ensure orders are in correct state**

### During Processing
- ✅ **Monitor output** for errors or warnings
- ✅ **Don't interrupt** the process once started
- ✅ **Keep terminal session active**

### After Processing
- ✅ **Verify results** in Admin UI
- ✅ **Check email notifications** were sent
- ✅ **Document any issues** for future reference
- ✅ **Archive processed CSV** for records

## File Locations

- **Script**: `/home/vendure/rottenhand/backend/scripts/bulk-tracking-cli.ts`
- **Default CSV**: `/home/vendure/rottenhand/backend/scripts/tracking.csv`
- **Guide**: `/home/vendure/rottenhand/backend/scripts/BULK_TRACKING_GUIDE.md`
- **Working Directory**: `/home/vendure/rottenhand/backend/`

## Support

If you encounter issues:
1. Check this guide first
2. Review error messages in script output
3. Test with dry-run mode to isolate problems
4. Verify CSV format and data accuracy

---

*Last updated: July 2025*
*Script version: 2.0 (with fulfillment lines support)*
