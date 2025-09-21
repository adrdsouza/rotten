# Order Deletion Summary

This document summarizes the process of deleting all orders from the Vendure database.

## Process

1.  **Backup:** A complete backup of all order-related tables was created and stored in `/home/vendure/rottenhand/database/exports/`.
2.  **Dry Run:** A dry run was performed to count all orders and related data that would be deleted. This ensured that the deletion script was targeting the correct data.
3.  **Deletion:** The `delete_all_orders.sql` script was executed to permanently delete all orders and their related data from the database. The script was modified to handle refunds correctly to avoid foreign key constraint violations.

## Scripts

-   `backup_all_orders.sh`: This script was used to create a backup of all order-related tables.
-   `dry_run_delete_all_orders.sql`: This script was used to perform a dry run of the deletion process.
-   `delete_all_orders.sql`: This script was used to permanently delete all orders and their related data from the database.