#!/bin/bash
# Script to export PaymentSettled orders to a clean CSV file

# Run the SQL query and save to a temporary file
sudo -u postgres psql -d vendure_db -c "
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
FROM 
  \"order\" o
LEFT JOIN 
  customer c ON o.\"customerId\" = c.id
LEFT JOIN 
  order_line ol ON o.id = ol.\"orderId\"
LEFT JOIN 
  product_variant pv ON ol.\"productVariantId\" = pv.id
LEFT JOIN 
  product p ON pv.\"productId\" = p.id
LEFT JOIN 
  product_translation pt ON p.id = pt.\"baseId\" AND pt.\"languageCode\" = 'en'
LEFT JOIN 
  product_variant_translation pvt ON pv.id = pvt.\"baseId\" AND pvt.\"languageCode\" = 'en'
WHERE 
  o.state = 'PaymentSettled'
ORDER BY 
  o.\"createdAt\" DESC, o.id, ol.id
" -A -F',' --pset=footer=off --csv -o temp_export.csv

# Add header row to final CSV file
echo "order_id,order_code,customer_name,email,order_date,shipping_name,shipping_company,shipping_street1,shipping_street2,shipping_city,shipping_province,shipping_postal_code,shipping_country,shipping_phone,sku,product_name,variant_name,quantity" > payment_settled_orders.csv

# Append data rows to final CSV file
cat temp_export.csv >> payment_settled_orders.csv

# Clean up temporary file
rm temp_export.csv

echo "Export completed successfully to payment_settled_orders.csv"
