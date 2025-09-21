import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Fix active orders - set completed orders to inactive
 * This ensures that PaymentSettled and PaymentAuthorized orders are not considered "active"
 */
export class FixActiveOrders1758416500000 implements MigrationInterface {
    name = 'FixActiveOrders1758416500000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set completed orders as inactive
        // PaymentSettled and PaymentAuthorized orders should not be active
        const result = await queryRunner.query(`
            UPDATE "order" 
            SET active = false 
            WHERE state IN ('PaymentSettled', 'PaymentAuthorized', 'Delivered', 'Shipped', 'Cancelled')
            AND active = true
        `);

        console.log(`✅ Fixed ${result.affectedRows || 0} completed orders - set active = false`);
        
        // Also clear session references to these orders
        await queryRunner.query(`
            UPDATE session 
            SET "activeOrderId" = NULL 
            WHERE "activeOrderId" IN (
                SELECT id FROM "order" 
                WHERE state IN ('PaymentSettled', 'PaymentAuthorized', 'Delivered', 'Shipped', 'Cancelled')
            )
        `);

        console.log('✅ Cleared session references to completed orders');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // This migration is a data fix, no rollback needed
        console.log('✅ No rollback needed for active order fix');
    }
}