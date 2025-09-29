import { MigrationInterface, QueryRunner } from 'typeorm';

export class CartOrderMapping1753612000000 implements MigrationInterface {
    name = 'CartOrderMapping1753612000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if database migration is needed before proceeding
        const tableExists = await queryRunner.hasTable('cart_order_mapping');
        if (tableExists) {
            console.log('cart_order_mapping table already exists, skipping creation');
            return;
        }

        console.log('Creating cart_order_mapping table for official Stripe plugin migration');
        
        // Create cart-order mapping table for audit trail and pre-order tracking
        await queryRunner.query(`
            CREATE TABLE "cart_order_mapping" (
                "id" SERIAL NOT NULL,
                "cartUuid" character varying(36) NOT NULL,
                "orderId" character varying NOT NULL,
                "orderCode" character varying NOT NULL,
                "paymentIntentId" character varying,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "completedAt" TIMESTAMP,
                CONSTRAINT "PK_cart_order_mapping" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_cart_uuid" UNIQUE ("cartUuid")
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`CREATE INDEX "IDX_cart_uuid" ON "cart_order_mapping" ("cartUuid")`);
        await queryRunner.query(`CREATE INDEX "IDX_order_code" ON "cart_order_mapping" ("orderCode")`);
        await queryRunner.query(`CREATE INDEX "IDX_payment_intent_id" ON "cart_order_mapping" ("paymentIntentId")`);
        
        // NOTE: Keeping pending_stripe_payment table during transition
        // Can be dropped after confirming new system works
        console.log('Migration completed - cart_order_mapping table created');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_payment_intent_id"`);
        await queryRunner.query(`DROP INDEX "IDX_order_code"`);
        await queryRunner.query(`DROP INDEX "IDX_cart_uuid"`);
        await queryRunner.query(`DROP TABLE "cart_order_mapping"`);
    }
}