import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCartOrderMapping1759178700000 implements MigrationInterface {
    name = 'CreateCartOrderMapping1759178700000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "cart_order_mapping" (
                "id" SERIAL PRIMARY KEY,
                "cartUuid" varchar(255) UNIQUE NOT NULL,
                "orderId" integer REFERENCES "order"("id"),
                "createdAt" timestamp DEFAULT now(),
                "updatedAt" timestamp DEFAULT now()
            )
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_cart_uuid" ON "cart_order_mapping" ("cartUuid")
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_order_id" ON "cart_order_mapping" ("orderId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_order_id"`);
        await queryRunner.query(`DROP INDEX "IDX_cart_uuid"`);
        await queryRunner.query(`DROP TABLE "cart_order_mapping"`);
    }
}