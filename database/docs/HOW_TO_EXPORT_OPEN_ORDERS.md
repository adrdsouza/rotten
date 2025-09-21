# How to Export Open Orders

## Quick Export Command

To export all open orders (not shipped, delivered, or cancelled) to CSV:

```bash
cd /home/vendure/damneddesigns
sudo -u postgres psql -d vendure_db -f database/export_open_orders.sql
```

This will:
1. Show you a count of open orders
2. Show breakdown by order status  
3. Export to `active_orders_export.csv` in the current directory
4. Show confirmation message

## Alternative: Shell Script

You can also run the shell script:

```bash
cd /home/vendure/damneddesigns
./database/export_open_orders.sh
```

## What Gets Exported

**Open Orders Include:**
- PaymentSettled (paid, ready to ship)
- PaymentAuthorized (authorized but not settled)
- ArrangingPayment (payment in progress)
- AddingItems (customer still adding items)
- PartiallyShipped (some items shipped)

**Excluded Orders:**
- Cancelled
- Shipped  
- Delivered

## Export Fields

The CSV includes:
- order_code, order_status, email
- Full shipping address (name, street, city, state, postal code, country, phone)
- Product details (SKU, description, quantity)
- Pricing (unit price, line total, shipping cost, order totals)

## File Location

The export file will be created in your current directory as:
- `active_orders_export.csv` (SQL method)
- `active_orders_export_YYYY-MM-DD.csv` (shell script method)

## Troubleshooting

If you get permission errors, make sure you're running the command with `sudo -u postgres` as shown above.
