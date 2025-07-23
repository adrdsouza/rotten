-- DRY RUN: Analyze orders DD29426 onwards before deletion
-- This script shows what would be deleted without actually deleting anything

-- Show orders to be deleted
SELECT 'Orders that would be deleted (DD29426 onwards):' as info;
SELECT 
    o.id,
    o.code,
    o.state,
    o."createdAt",
    o."updatedAt",
    CASE WHEN r.id IS NOT NULL THEN 'HAS_REFUNDS' ELSE 'NO_REFUNDS' END as refund_status
FROM "order" o
LEFT JOIN payment p ON p."orderId" = o.id
LEFT JOIN refund r ON r."paymentId" = p.id
WHERE o.code >= 'DD29426'
ORDER BY o.code;

-- Show payments that would be affected
SELECT 'Payments that would be deleted:' as info;
SELECT 
    p.id as payment_id,
    p.method,
    p.amount,
    p.state as payment_state,
    o.code as order_code
FROM payment p
INNER JOIN "order" o ON p."orderId" = o.id
WHERE o.code >= 'DD29426'
ORDER BY o.code;

-- Show refunds that would be deleted
SELECT 'Refunds that would be deleted:' as info;
SELECT 
    r.id as refund_id,
    r.total as refund_amount,
    r.state as refund_state,
    p.id as payment_id,
    o.code as order_code
FROM refund r
INNER JOIN payment p ON r."paymentId" = p.id
INNER JOIN "order" o ON p."orderId" = o.id
WHERE o.code >= 'DD29426'
ORDER BY o.code;

-- Show order lines that would be deleted
SELECT 'Order lines that would be deleted:' as info;
SELECT 
    ol.id as order_line_id,
    ol.quantity,
    ol."unitPrice",
    ol."linePrice",
    pv.name as product_variant,
    o.code as order_code
FROM order_line ol
INNER JOIN "order" o ON ol."orderId" = o.id
LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
WHERE o.code >= 'DD29426'
ORDER BY o.code;

-- Show history entries that would be deleted
SELECT 'History entries that would be deleted:' as info;
SELECT 
    he.id as history_id,
    he.type,
    he."createdAt",
    o.code as order_code
FROM history_entry he
INNER JOIN "order" o ON he."orderId" = o.id
WHERE o.code >= 'DD29426'
ORDER BY o.code, he."createdAt";

-- Show stock movements that would be deleted
SELECT 'Stock movements that would be deleted:' as info;
SELECT 
    sm.id as stock_movement_id,
    sm.type,
    sm.quantity,
    pv.name as product_variant,
    o.code as order_code
FROM stock_movement sm
INNER JOIN order_line ol ON sm."orderLineId" = ol.id
INNER JOIN "order" o ON ol."orderId" = o.id
LEFT JOIN product_variant pv ON ol."productVariantId" = pv.id
WHERE o.code >= 'DD29426'
ORDER BY o.code;

-- Summary counts
SELECT 'Summary of items to be deleted:' as info;
SELECT 
    'Orders' as item_type,
    COUNT(*) as count
FROM "order" o
WHERE o.code >= 'DD29426'
UNION ALL
SELECT 
    'Payments' as item_type,
    COUNT(*) as count
FROM payment p
INNER JOIN "order" o ON p."orderId" = o.id
WHERE o.code >= 'DD29426'
UNION ALL
SELECT 
    'Refunds' as item_type,
    COUNT(*) as count
FROM refund r
INNER JOIN payment p ON r."paymentId" = p.id
INNER JOIN "order" o ON p."orderId" = o.id
WHERE o.code >= 'DD29426'
UNION ALL
SELECT 
    'Order Lines' as item_type,
    COUNT(*) as count
FROM order_line ol
INNER JOIN "order" o ON ol."orderId" = o.id
WHERE o.code >= 'DD29426'
UNION ALL
SELECT 
    'History Entries' as item_type,
    COUNT(*) as count
FROM history_entry he
INNER JOIN "order" o ON he."orderId" = o.id
WHERE o.code >= 'DD29426'
UNION ALL
SELECT 
    'Stock Movements' as item_type,
    COUNT(*) as count
FROM stock_movement sm
INNER JOIN order_line ol ON sm."orderLineId" = ol.id
INNER JOIN "order" o ON ol."orderId" = o.id
WHERE o.code >= 'DD29426';

SELECT 'DRY RUN COMPLETE - Review the above data before running the actual deletion script' as final_message;
