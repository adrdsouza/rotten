import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Performance optimization indexes for shop page queries
 * These indexes improve product variant lookups, stock filtering, and price operations
 */
export class AddPerformanceIndexes1753611000000 implements MigrationInterface {
    name = 'AddPerformanceIndexes1753611000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Index for stock level filtering (helps with availability checks)
        // Indexes stock_level table for efficient stock queries
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_stock_level_variant_stock
            ON stock_level("productVariantId", "stockOnHand")
            WHERE "stockOnHand" > 0
        `);

        // 2. Index for stock location lookups
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_stock_level_location_variant
            ON stock_level("stockLocationId", "productVariantId")
        `);

        // 3. Index for product variant SKU lookups (if used in search)
        // Only indexes non-null SKUs
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_product_variant_sku
            ON product_variant(sku)
            WHERE sku IS NOT NULL
        `);

        // 4. Index for product variant enabled status
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS idx_product_variant_enabled
            ON product_variant(enabled, "productId")
            WHERE enabled = true
        `);

        console.log('✅ Performance indexes created successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes in reverse order
        await queryRunner.query(`DROP INDEX IF EXISTS idx_product_variant_enabled`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_product_variant_sku`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_level_location_variant`);
        await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_level_variant_stock`);

        console.log('✅ Performance indexes dropped successfully');
    }
}
