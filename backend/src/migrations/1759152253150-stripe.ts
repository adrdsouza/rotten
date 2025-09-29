import {MigrationInterface, QueryRunner} from "typeorm";

export class Stripe1759152253150 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_product_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_asset_type"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_asset_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_state"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_customer_id"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_variant_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_variant_sku"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_variant_product_id"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_customer_email_address"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_customer_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_cart_uuid"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_order_code"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_payment_intent_id"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsStripecustomerid" character varying(255)`, undefined);
        await queryRunner.query(`ALTER TABLE "cart_order_mapping" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`, undefined);
        await queryRunner.query(`ALTER TABLE "cart_order_mapping" DROP CONSTRAINT "UQ_cart_uuid"`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_788fc9e5b02ecc5003a8747660" ON "cart_order_mapping" ("cartUuid") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_a9e49d622cefc840a314c494a5" ON "cart_order_mapping" ("orderId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_646211beecab06162f31646bc8" ON "cart_order_mapping" ("orderCode") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_45d0d0c798d37b52d29a5d9a8d" ON "cart_order_mapping" ("paymentIntentId") `, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."IDX_45d0d0c798d37b52d29a5d9a8d"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_646211beecab06162f31646bc8"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_a9e49d622cefc840a314c494a5"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_788fc9e5b02ecc5003a8747660"`, undefined);
        await queryRunner.query(`ALTER TABLE "cart_order_mapping" ADD CONSTRAINT "UQ_cart_uuid" UNIQUE ("cartUuid")`, undefined);
        await queryRunner.query(`ALTER TABLE "cart_order_mapping" DROP COLUMN "updatedAt"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsStripecustomerid"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_payment_intent_id" ON "cart_order_mapping" ("paymentIntentId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_order_code" ON "cart_order_mapping" ("orderCode") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_cart_uuid" ON "cart_order_mapping" ("cartUuid") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_customer_created_at" ON "customer" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_customer_email_address" ON "customer" ("emailAddress") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_variant_product_id" ON "product_variant" ("productId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_variant_sku" ON "product_variant" ("sku") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_variant_enabled" ON "product_variant" ("enabled") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_order_customer_id" ON "order" ("customerId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_order_state" ON "order" ("state") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_order_updated_at" ON "order" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_order_created_at" ON "order" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_asset_created_at" ON "asset" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_asset_type" ON "asset" ("type") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_updated_at" ON "product" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_created_at" ON "product" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_product_enabled" ON "product" ("enabled") `, undefined);
   }

}
