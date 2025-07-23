# My Order Export Guide

This is my personal reference for exporting orders from my Vendure shop's database, focusing on PaymentSettled orders that need to be fulfilled.

## Quick Reference

```bash
# One-line command to export all active orders (excluding Cancelled, Shipped, Delivered) to CSV with prices and totals
cd /home/vendure/database_analysis && sudo -u postgres psql -d vendure_db -c "\copy (SELECT o.code AS order_code, o.state AS order_status, COALESCE(c.\"emailAddress\", 'No Email') AS email, COALESCE(o.\"shippingAddress\"::json->>'fullName', '') AS Name, COALESCE(o.\"shippingAddress\"::json->>'streetLine1', '') AS Street_1, COALESCE(o.\"shippingAddress\"::json->>'streetLine2', '') AS Street_2, COALESCE(o.\"shippingAddress\"::json->>'city', '') AS City, COALESCE(o.\"shippingAddress\"::json->>'province', '') AS State, COALESCE(o.\"shippingAddress\"::json->>'postalCode', '') AS Post_Code, COALESCE(o.\"shippingAddress\"::json->>'countryCode', '') AS Country, COALESCE(o.\"shippingAddress\"::json->>'phoneNumber', '') AS Phone, pv.sku AS SKU, CASE WHEN pvt.name = '' OR pvt.name IS NULL THEN pt.name ELSE pt.name || ' - ' || pvt.name END AS product_description, ol.quantity AS quantity, (ol.\"listPrice\"/100.0) AS unit_price_usd, (ol.quantity * ol.\"listPrice\"/100.0) AS line_total_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"shippingWithTax\"/100.0) ELSE NULL END AS shipping_cost_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"subTotalWithTax\"/100.0) ELSE NULL END AS order_subtotal_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN ((o.\"subTotalWithTax\" + o.\"shippingWithTax\")/100.0) ELSE NULL END AS order_total_usd FROM \"order\" o LEFT JOIN customer c ON o.\"customerId\" = c.id LEFT JOIN order_line ol ON o.id = ol.\"orderId\" LEFT JOIN product_variant pv ON ol.\"productVariantId\" = pv.id LEFT JOIN product p ON pv.\"productId\" = p.id LEFT JOIN product_translation pt ON p.id = pt.\"baseId\" AND pt.\"languageCode\" = 'en' LEFT JOIN product_variant_translation pvt ON pv.id = pvt.\"baseId\" AND pvt.\"languageCode\" = 'en' WHERE o.state NOT IN ('Cancelled', 'Shipped', 'Delivered') ORDER BY o.\"createdAt\" DESC, o.id, ol.id) TO STDOUT WITH CSV HEADER" > active_orders_export_$(date +%Y-%m-%d).csv
```

## Exporting My PaymentSettled Orders

I use this command to export orders that need to be fulfilled. These are orders that have been paid (PaymentSettled) but not yet shipped.

### My Export Command

To export all orders in the PaymentSettled state to a CSV file, use the following command:

```bash
cd /home/vendure/database_analysis
sudo -u postgres psql -d vendure_db -c "\copy (
  SELECT 
    o.id AS order_id,
    o.code AS order_code,
    COALESCE(c.\"firstName\" || ' ' || c.\"lastName\", 'Guest Customer') AS customer_name,
    COALESCE(c.\"emailAddress\", 'No Email') AS email,
    o.\"createdAt\" AS order_date,
    COALESCE(o.\"shippingAddress\"::json->>'fullName', '') AS shipping_name,
    COALESCE(o.\"shippingAddress\"::json->>'company', '') AS shipping_company,
    COALESCE(o.\"shippingAddress\"::json->>'streetLine1', '') AS shipping_street1,
    COALESCE(o.\"shippingAddress\"::json->>'streetLine2', '') AS shipping_street2,
    COALESCE(o.\"shippingAddress\"::json->>'city', '') AS shipping_city,
    COALESCE(o.\"shippingAddress\"::json->>'province', '') AS shipping_province,
    COALESCE(o.\"shippingAddress\"::json->>'postalCode', '') AS shipping_postal_code,
    COALESCE(o.\"shippingAddress\"::json->>'countryCode', '') AS shipping_country,
    COALESCE(o.\"shippingAddress\"::json->>'phoneNumber', '') AS shipping_phone,
    pv.sku AS sku,
    pt.name AS product_name,
    pvt.name AS variant_name,
    ol.quantity AS quantity
  FROM \"order\" o
  LEFT JOIN customer c ON o.\"customerId\" = c.id
  LEFT JOIN order_line ol ON o.id = ol.\"orderId\"
  LEFT JOIN product_variant pv ON ol.\"productVariantId\" = pv.id
  LEFT JOIN product p ON pv.\"productId\" = p.id
  LEFT JOIN product_translation pt ON p.id = pt.\"baseId\" AND pt.\"languageCode\" = 'en'
  LEFT JOIN product_variant_translation pvt ON pv.id = pvt.\"baseId\" AND pvt.\"languageCode\" = 'en'
  WHERE o.state = 'PaymentSettled'
  ORDER BY o.\"createdAt\" DESC, o.id, ol.id
) TO STDOUT WITH CSV HEADER" > payment_settled_orders.csv
```

#### Important Notes About This Command:

1. **The `\copy` Command**: This uses PostgreSQL's `\copy` command (not `COPY`) because it runs on the client side and avoids permission issues with the PostgreSQL server trying to write directly to the filesystem.

2. **CSV Formatting**: This command properly formats the CSV output with headers and handles any commas or special characters within the data fields automatically.

3. **Execution Environment**: Run this command as shown above from the `/home/vendure/database_analysis` directory.

4. **Output File**: The command will create or overwrite `payment_settled_orders.csv` in the current directory.

### Exported Fields

The export includes the following fields:

1. `order_code` - The customer-facing order code (e.g., DD12345)
2. `order_status` - The current status of the order (e.g., PaymentSettled, AddingItems, etc.)
3. `email` - The customer's email address
4. `Name` - The recipient name from the shipping address
5. `Street_1` - The first line of the shipping address
6. `Street_2` - The second line of the shipping address (if provided)
7. `City` - The city from the shipping address
8. `State` - The state/province from the shipping address
9. `Post_Code` - The postal/ZIP code from the shipping address
10. `Country` - The country code from the shipping address
11. `Phone` - The phone number from the shipping address
12. `SKU` - The SKU of the ordered product variant
13. `product_description` - Combined product name and variant (format: "Product Name - Variant Name")
14. `quantity` - The quantity of the product ordered
15. `unit_price_usd` - The unit price of the product in USD (converted from cents)
16. `line_total_usd` - The line item total (quantity × unit price) in USD
17. `shipping_cost_usd` - The shipping cost for the order in USD (converted from cents) - **only shown on first line of each order**
18. `order_subtotal_usd` - The order subtotal in USD (converted from cents) - **only shown on first line of each order**
19. `order_total_usd` - The complete order total including shipping in USD (converted from cents) - **only shown on first line of each order**

### Notes

- The export includes all active orders that are not in the `Cancelled`, `Shipped`, or `Delivered` states, allowing you to see all orders that need attention.
- The order status is included so you can easily filter by specific statuses if needed.
- The export is ordered by order creation date (newest first), then by order ID, and finally by order line ID within each order.
- Monetary values are converted from cents (stored in the database) to dollars for readability.
- The shipping address is stored as a JSON object in the database and is parsed into individual fields for the export.
- Product name and variant name are combined into a single `product_description` field for easier reading.

### Financial Calculations and Window Functions

The export includes several financial calculations to help with order analysis and fulfillment:

1. **Line Total Calculation**
   - `line_total_usd = quantity × unit_price_usd`
   - This shows the total cost for each line item

2. **Order-Level Information**
   - To avoid redundant data in the CSV (which would make pivot tables difficult), order-level financial information appears only on the first line of each order
   - This is achieved using PostgreSQL window functions: `ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id)`
   - When this row number equals 1, we show the order-level values; otherwise, they appear as NULL

3. **Order Totals**
   - `order_subtotal_usd`: The sum of all line items with tax (from `o."subTotalWithTax"`)
   - `shipping_cost_usd`: The shipping cost for the entire order (from `o."shippingWithTax"`)
   - `order_total_usd`: The complete order total (`order_subtotal_usd + shipping_cost_usd`)

4. **Working with the Data**
   - When importing to spreadsheets, the NULL values for shipping and order totals on non-first lines allow for cleaner pivot tables
   - For financial reporting, you can sum the `line_total_usd` column to get the total revenue from products
   - For order fulfillment, each row represents one product variant to be picked and packed

### Modifying the Export

### Exporting Orders in Different States

To export orders in a different state, change the `WHERE` clause in the SQL query:

```sql
WHERE o.state = 'Delivered'  -- For delivered orders
WHERE o.state = 'Cancelled'  -- For cancelled orders
```

Available order states include:
- 'AddingItems'
- 'ArrangingPayment'
- 'PaymentAuthorized'
- 'PaymentSettled'
- 'PartiallyShipped'
- 'Shipped'
- 'Delivered'
- 'Cancelled'

### Adding Additional Fields

To add more fields to the export, add them to the SELECT statement. Some useful additional fields:

```sql
o.\"subTotalWithTax\" / 100.0 AS subtotal,
o.\"shippingWithTax\" / 100.0 AS shipping_cost,
COALESCE(pay.method, 'Unknown') AS payment_method,
```

## Troubleshooting

### Permission Issues

If you encounter permission errors when writing the CSV file, ensure you have the correct permissions:

```bash
touch payment_settled_orders.csv
chmod 666 payment_settled_orders.csv
```

### Empty Export

If the export file is empty, verify that there are orders in the specified state:

```bash
sudo -u postgres psql -d vendure_db -c "SELECT COUNT(*) FROM \"order\" WHERE state = 'PaymentSettled'"
```

## Regular Export Schedule

For regular order processing, it's recommended to:

1. Export PaymentSettled orders daily
2. Process and fulfill the orders
3. Update the order states in Vendure to 'Shipped' or 'Delivered' as appropriate

This will ensure that the next export only includes new orders that need to be processed.

## Rotten Hand Order Fulfillment Workflow

The following workflow is optimized for Rotten Hand' e-commerce operations:

1. **Daily Export**: Each morning, run the export command to generate a fresh CSV of all PaymentSettled orders:
   ```bash
   cd /home/vendure/database_analysis && sudo -u postgres psql -d vendure_db -c "\copy (SELECT o.id AS order_id, o.code AS order_code, COALESCE(c.\"firstName\" || ' ' || c.\"lastName\", 'Guest Customer') AS customer_name, COALESCE(c.\"emailAddress\", 'No Email') AS email, o.\"createdAt\" AS order_date, COALESCE(o.\"shippingAddress\"::json->>'fullName', '') AS shipping_name, COALESCE(o.\"shippingAddress\"::json->>'company', '') AS shipping_company, COALESCE(o.\"shippingAddress\"::json->>'streetLine1', '') AS shipping_street1, COALESCE(o.\"shippingAddress\"::json->>'streetLine2', '') AS shipping_street2, COALESCE(o.\"shippingAddress\"::json->>'city', '') AS shipping_city, COALESCE(o.\"shippingAddress\"::json->>'province', '') AS shipping_province, COALESCE(o.\"shippingAddress\"::json->>'postalCode', '') AS shipping_postal_code, COALESCE(o.\"shippingAddress\"::json->>'countryCode', '') AS shipping_country, COALESCE(o.\"shippingAddress\"::json->>'phoneNumber', '') AS shipping_phone, pv.sku AS sku, pt.name AS product_name, pvt.name AS variant_name, ol.quantity AS quantity, (ol.\"listPrice\"/100.0) AS unit_price_usd, (ol.quantity * ol.\"listPrice\"/100.0) AS line_total_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"shippingWithTax\"/100.0) ELSE NULL END AS shipping_cost_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"subTotalWithTax\"/100.0) ELSE NULL END AS order_subtotal_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN ((o.\"subTotalWithTax\" + o.\"shippingWithTax\")/100.0) ELSE NULL END AS order_total_usd FROM \"order\" o LEFT JOIN customer c ON o.\"customerId\" = c.id LEFT JOIN order_line ol ON o.id = ol.\"orderId\" LEFT JOIN product_variant pv ON ol.\"productVariantId\" = pv.id LEFT JOIN product p ON pv.\"productId\" = p.id LEFT JOIN product_translation pt ON p.id = pt.\"baseId\" AND pt.\"languageCode\" = 'en' LEFT JOIN product_variant_translation pvt ON pv.id = pvt.\"baseId\" AND pvt.\"languageCode\" = 'en' WHERE o.state = 'PaymentSettled' ORDER BY o.\"createdAt\" DESC, o.id, ol.id) TO STDOUT WITH CSV HEADER" > /home/vendure/database_analysis/payment_settled_orders_$(date +%Y-%m-%d).csv
   ```
   This command adds the current date to the filename for better tracking.

2. **Order Processing**:
   - Import the CSV into your order fulfillment system or spreadsheet
   - Group orders by product for efficient picking
   - Prepare shipping labels using the exported address information

3. **Order Status Updates**:
   - After shipping orders, update their status in Vendure to prevent them from appearing in future exports
   - This can be done through the Vendure Admin UI or via bulk update scripts

4. **Record Keeping**:
   - Store the dated CSV files for at least 90 days for reference
   - Consider creating a monthly archive of all orders for business analytics
