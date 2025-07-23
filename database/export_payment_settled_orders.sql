-- Export Orders to CSV (excluding cancelled, shipped, and delivered)
-- This script contains only the SQL query part for the export
-- Run the export with:
-- sudo -u postgres psql -d vendure_db -c "\copy (SELECT o.code AS order_code, o.state AS order_status, COALESCE(c.\"emailAddress\", 'No Email') AS email, COALESCE(o.\"shippingAddress\"::json->>'fullName', '') AS Name, COALESCE(o.\"shippingAddress\"::json->>'streetLine1', '') AS Street_1, COALESCE(o.\"shippingAddress\"::json->>'streetLine2', '') AS Street_2, COALESCE(o.\"shippingAddress\"::json->>'city', '') AS City, COALESCE(o.\"shippingAddress\"::json->>'province', '') AS State, COALESCE(o.\"shippingAddress\"::json->>'postalCode', '') AS Post_Code, COALESCE(o.\"shippingAddress\"::json->>'countryCode', '') AS Country, COALESCE(o.\"shippingAddress\"::json->>'phoneNumber', '') AS Phone, pv.sku AS SKU, CASE WHEN pvt.name = '' OR pvt.name IS NULL THEN pt.name ELSE pt.name || ' - ' || pvt.name END AS product_description, ol.quantity AS quantity, (ol.\"listPrice\"/100.0) AS unit_price_usd, (ol.quantity * ol.\"listPrice\"/100.0) AS line_total_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"shippingWithTax\"/100.0) ELSE NULL END AS shipping_cost_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o.\"subTotalWithTax\"/100.0) ELSE NULL END AS order_subtotal_usd, CASE WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN ((o.\"subTotalWithTax\" + o.\"shippingWithTax\")/100.0) ELSE NULL END AS order_total_usd FROM \"order\" o LEFT JOIN customer c ON o.\"customerId\" = c.id LEFT JOIN order_line ol ON o.id = ol.\"orderId\" LEFT JOIN product_variant pv ON ol.\"productVariantId\" = pv.id LEFT JOIN product p ON pv.\"productId\" = p.id LEFT JOIN product_translation pt ON p.id = pt.\"baseId\" AND pt.\"languageCode\" = 'en' LEFT JOIN product_variant_translation pvt ON pv.id = pvt.\"baseId\" AND pvt.\"languageCode\" = 'en' WHERE o.state NOT IN ('Cancelled', 'Shipped', 'Delivered') ORDER BY o.\"createdAt\" DESC, o.id, ol.id) TO STDOUT WITH CSV HEADER" > active_orders_export_$(date +%Y-%m-%d).csv

SELECT
    o.code AS order_code,
    o.state AS order_status,
    COALESCE(c."emailAddress", 'No Email') AS email,
    COALESCE(o."shippingAddress"::json->>'fullName', '') AS Name,
    COALESCE(o."shippingAddress"::json->>'streetLine1', '') AS Street_1,
    COALESCE(o."shippingAddress"::json->>'streetLine2', '') AS Street_2,
    COALESCE(o."shippingAddress"::json->>'city', '') AS City,
    COALESCE(o."shippingAddress"::json->>'province', '') AS State,
    COALESCE(o."shippingAddress"::json->>'postalCode', '') AS Post_Code,
    COALESCE(o."shippingAddress"::json->>'countryCode', '') AS Country,
    COALESCE(o."shippingAddress"::json->>'phoneNumber', '') AS Phone,
    pv.sku AS SKU,
    CASE 
        WHEN pvt.name = '' OR pvt.name IS NULL THEN pt.name 
        ELSE pt.name || ' - ' || pvt.name 
    END AS product_description,
    ol.quantity AS quantity,
    (ol."listPrice"/100.0) AS unit_price_usd,
    (ol.quantity * ol."listPrice"/100.0) AS line_total_usd,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o."shippingWithTax"/100.0) 
        ELSE NULL 
    END AS shipping_cost_usd,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN (o."subTotalWithTax"/100.0) 
        ELSE NULL 
    END AS order_subtotal_usd,
    CASE 
        WHEN ROW_NUMBER() OVER (PARTITION BY o.id ORDER BY ol.id) = 1 THEN ((o."subTotalWithTax" + o."shippingWithTax")/100.0) 
        ELSE NULL 
    END AS order_total_usd
FROM
    "order" o
    LEFT JOIN customer c ON o."customerId" = c.id
    LEFT JOIN order_line ol ON o.id = ol."orderId"
    LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
    LEFT JOIN product p ON pv."productId" = p.id
    LEFT JOIN product_translation pt ON p.id = pt."baseId" AND pt."languageCode" = 'en'
    LEFT JOIN product_variant_translation pvt ON pv.id = pvt."baseId" AND pvt."languageCode" = 'en'
WHERE
    o.state NOT IN ('Cancelled', 'Shipped', 'Delivered')
ORDER BY
    o."createdAt" DESC, o.id, ol.id;
