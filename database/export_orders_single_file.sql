-- Export both cancelled and adding items orders to a single CSV file
\copy (SELECT o.state, o."createdAt" as date, c."emailAddress" as email FROM "order" o LEFT JOIN customer c ON o."customerId" = c.id WHERE o.state IN ('Cancelled', 'AddingItems') ORDER BY o.state, o."createdAt" DESC) TO '/tmp/orders_to_cleanup.csv' WITH CSV HEADER;

-- Show preview of what was exported
SELECT 
    o.state,
    o."createdAt" as date,
    c."emailAddress" as email
FROM "order" o
LEFT JOIN customer c ON o."customerId" = c.id
WHERE o.state IN ('Cancelled', 'AddingItems')
ORDER BY o.state, o."createdAt" DESC;
