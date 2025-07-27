import {MigrationInterface, QueryRunner} from "typeorm";

export class StripeCustomerField1753610914785 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."idx_product_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_deleted_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_asset_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_asset_name"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_active"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_state"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_deleted_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_sku"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_deleted_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_email"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_updated_at"`, undefined);
        await queryRunner.query(`ALTER TABLE "asset" DROP COLUMN "customFieldsPreviewimagehash"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsStripecustomerid" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsStripecustomerid"`, undefined);
        await queryRunner.query(`ALTER TABLE "asset" ADD "customFieldsPreviewimagehash" character varying(255)`, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_updated_at" ON "customer" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_email" ON "customer" ("emailAddress") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_deleted_at" ON "customer" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_created_at" ON "customer" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_updated_at" ON "product_variant" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_sku" ON "product_variant" ("sku") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_enabled" ON "product_variant" ("enabled") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_deleted_at" ON "product_variant" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_created_at" ON "product_variant" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_updated_at" ON "order" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_state" ON "order" ("state") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_created_at" ON "order" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_active" ON "order" ("active") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_asset_name" ON "asset" ("name") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_asset_created_at" ON "asset" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_updated_at" ON "product" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_enabled" ON "product" ("enabled") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_deleted_at" ON "product" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_created_at" ON "product" ("createdAt") `, undefined);
   }

}
