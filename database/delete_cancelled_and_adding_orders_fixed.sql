-- Safe deletion of cancelled and adding items orders (FIXED VERSION)
-- This script includes refund handling to avoid foreign key constraint violations

BEGIN;

-- First, let's see what we're about to delete
SELECT 'Orders to be deleted:' as info;
SELECT state, COUNT(*) as count FROM "order" WHERE state IN ('Cancelled', 'AddingItems') GROUP BY state;

-- Store the order IDs we want to delete (excluding orders with refunds)
CREATE TEMP TABLE orders_to_delete AS
SELECT o.id FROM "order" o
WHERE o.state IN ('Cancelled', 'AddingItems')
AND o.id NOT IN (
    SELECT DISTINCT p."orderId" 
    FROM payment p 
    INNER JOIN refund r ON r."paymentId" = p.id
    WHERE p."orderId" IS NOT NULL
);

-- Delete related data in the correct order (following foreign key dependencies)

-- 1. Skip refund deletion since we're excluding orders with refunds
-- Orders with refunds are excluded from deletion to avoid constraint violations

-- 2. Delete stock movements (references order_line.id)
DELETE FROM stock_movement 
WHERE "orderLineId" IN (
    SELECT ol.id FROM order_line ol 
    WHERE ol."orderId" IN (SELECT id FROM orders_to_delete)
);

-- 3. Delete history entries
DELETE FROM history_entry WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 4. Delete order channel relationships
DELETE FROM order_channels_channel WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 5. Delete order fulfillment relationships
DELETE FROM order_fulfillments_fulfillment WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 6. Delete order lines
DELETE FROM order_line WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 7. Delete order modifications
DELETE FROM order_modification WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 8. Delete order promotion relationships
DELETE FROM order_promotions_promotion WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 9. Delete payments (now safe after refunds are deleted)
DELETE FROM payment WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 10. Delete shipping lines
DELETE FROM shipping_line WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 11. Delete surcharges
DELETE FROM surcharge WHERE "orderId" IN (SELECT id FROM orders_to_delete);

-- 12. Update sessions to remove references (set to NULL, don't delete sessions)
UPDATE session SET "activeOrderId" = NULL WHERE "activeOrderId" IN (SELECT id FROM orders_to_delete);

-- 13. Update self-referencing orders (set aggregateOrderId to NULL)
UPDATE "order" SET "aggregateOrderId" = NULL WHERE "aggregateOrderId" IN (SELECT id FROM orders_to_delete);

-- 14. Finally, delete the orders themselves
DELETE FROM "order" WHERE id IN (SELECT id FROM orders_to_delete);

-- Show the results
SELECT 'Deletion completed. Remaining order distribution:' as info;
SELECT state, COUNT(*) as count FROM "order" GROUP BY state ORDER BY count DESC;

COMMIT;

-- Final verification
SELECT 'Final verification - these should be 0:' as info;
SELECT 
    'Cancelled orders remaining' as check_type, 
    COUNT(*) as count 
FROM "order" WHERE state = 'Cancelled'
UNION ALL
SELECT 
    'AddingItems orders remaining' as check_type, 
    COUNT(*) as count 
FROM "order" WHERE state = 'AddingItems';
