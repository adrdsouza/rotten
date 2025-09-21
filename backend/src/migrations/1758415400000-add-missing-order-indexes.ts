import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add missing order indexes that are critical for activeOrder query behavior
 * These indexes ensure proper performance and behavior for order state management
 */
export class AddMissingOrderIndexes1758415400000 implements MigrationInterface {
    name = 'AddMissingOrderIndexes1758415400000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // CRITICAL: Index for order active status
        // This index is crucial for activeOrder query performance and behavior
        // It ensures that completed orders are properly filtered out of active order queries
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_active ON "order"(active)`);

        // Index for order state filtering (helps with order management and state transitions)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_state ON "order"(state)`);

        // Index for order creation date sorting (helps with order history queries)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_created_at ON "order"("createdAt")`);

        // Index for order update date (helps with recent activity queries)
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_order_updated_at ON "order"("updatedAt")`);

        console.log('✅ Missing order indexes added successfully - this should fix activeOrder query issues');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS idx_order_updated_at`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_order_created_at`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_order_state`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_order_active`);

        console.log('✅ Order indexes dropped successfully');
    }
}