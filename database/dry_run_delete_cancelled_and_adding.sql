-- DRY RUN: Analysis of what would be deleted for cancelled and adding items orders
-- This script shows what would be affected WITHOUT actually deleting anything

-- Orders that would be deleted
SELECT 'ORDERS TO BE DELETED:' as analysis_type;
SELECT state, COUNT(*) as count, 
       string_agg(DISTINCT code, ', ') as order_codes
FROM "order" 
WHERE state IN ('Cancelled', 'AddingItems') 
GROUP BY state;

-- Create temp table for analysis
CREATE TEMP TABLE orders_to_analyze AS
SELECT id, code, state FROM "order" WHERE state IN ('Cancelled', 'AddingItems');

-- Show detailed breakdown of what would be affected
SELECT 'RELATED DATA THAT WOULD BE DELETED:' as analysis_type;

-- Stock movements
SELECT 'stock_movement' as table_name, COUNT(*) as records_to_delete
FROM stock_movement 
WHERE "orderLineId" IN (
    SELECT ol.id FROM order_line ol 
    WHERE ol."orderId" IN (SELECT id FROM orders_to_analyze)
)

UNION ALL

-- History entries
SELECT 'history_entry' as table_name, COUNT(*) as records_to_delete
FROM history_entry WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Order channel relationships
SELECT 'order_channels_channel' as table_name, COUNT(*) as records_to_delete
FROM order_channels_channel WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Order fulfillment relationships
SELECT 'order_fulfillments_fulfillment' as table_name, COUNT(*) as records_to_delete
FROM order_fulfillments_fulfillment WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Order lines
SELECT 'order_line' as table_name, COUNT(*) as records_to_delete
FROM order_line WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Order modifications
SELECT 'order_modification' as table_name, COUNT(*) as records_to_delete
FROM order_modification WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Order promotion relationships
SELECT 'order_promotions_promotion' as table_name, COUNT(*) as records_to_delete
FROM order_promotions_promotion WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Payments
SELECT 'payment' as table_name, COUNT(*) as records_to_delete
FROM payment WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Shipping lines
SELECT 'shipping_line' as table_name, COUNT(*) as records_to_delete
FROM shipping_line WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

UNION ALL

-- Surcharges
SELECT 'surcharge' as table_name, COUNT(*) as records_to_delete
FROM surcharge WHERE "orderId" IN (SELECT id FROM orders_to_analyze)

ORDER BY records_to_delete DESC;

-- Sessions that would be updated (not deleted)
SELECT 'SESSIONS TO BE UPDATED (activeOrderId set to NULL):' as analysis_type;
SELECT COUNT(*) as sessions_to_update
FROM session WHERE "activeOrderId" IN (SELECT id FROM orders_to_analyze);

-- Self-referencing orders that would be updated
SELECT 'ORDERS TO BE UPDATED (aggregateOrderId set to NULL):' as analysis_type;
SELECT COUNT(*) as orders_to_update
FROM "order" WHERE "aggregateOrderId" IN (SELECT id FROM orders_to_analyze);

-- Final summary
SELECT 'SUMMARY:' as analysis_type;
SELECT 
    'Total orders to delete' as item,
    COUNT(*) as count
FROM orders_to_analyze
UNION ALL
SELECT 
    'Total related records across all tables' as item,
    (
        (SELECT COUNT(*) FROM stock_movement WHERE "orderLineId" IN (SELECT ol.id FROM order_line ol WHERE ol."orderId" IN (SELECT id FROM orders_to_analyze))) +
        (SELECT COUNT(*) FROM history_entry WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM order_channels_channel WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM order_fulfillments_fulfillment WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM order_line WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM order_modification WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM order_promotions_promotion WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM payment WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM shipping_line WHERE "orderId" IN (SELECT id FROM orders_to_analyze)) +
        (SELECT COUNT(*) FROM surcharge WHERE "orderId" IN (SELECT id FROM orders_to_analyze))
    ) as count;
