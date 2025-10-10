import {MigrationInterface, QueryRunner} from "typeorm";

export class AddSheeridCustomerFields1755092239310 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "public"."idx_product_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_deleted_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_asset_name"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_asset_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_state"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_active"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_order_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_enabled"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_sku"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_product_variant_deleted_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_email"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_created_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_updated_at"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."idx_customer_deleted_at"`, undefined);
        await queryRunner.query(`CREATE TABLE "settings_store_entry" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL, "value" json, "scope" character varying, "id" SERIAL NOT NULL, CONSTRAINT "PK_3a905b358c0b454f6fc6637d6db" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_ab560f7983976aec91b91c26a4" ON "settings_store_entry" ("key") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_8d8ddb95a0fbd11ffb5606ef0c" ON "settings_store_entry" ("scope") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "settings_store_key_scope_unique" ON "settings_store_entry" ("key", "scope") `, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsSheeridverifications" text`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsActiveverifications" text DEFAULT '[]'`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsVerificationmetadata" text`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "FK_cb66b63b6e97613013795eadbd5"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "REL_ad2991fa2933ed8b7f86a71633"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "REL_cb66b63b6e97613013795eadbd"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_af13739f4962eab899bdff34be" ON "order" ("orderPlacedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_86bc376c56af8cefd41a847a95" ON "job_record" ("createdAt") `, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "FK_cb66b63b6e97613013795eadbd5" FOREIGN KEY ("refundId") REFERENCES "refund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "FK_cb66b63b6e97613013795eadbd5"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" DROP CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_86bc376c56af8cefd41a847a95"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_af13739f4962eab899bdff34be"`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "REL_cb66b63b6e97613013795eadbd" UNIQUE ("refundId")`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "REL_ad2991fa2933ed8b7f86a71633" UNIQUE ("paymentId")`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "FK_cb66b63b6e97613013795eadbd5" FOREIGN KEY ("refundId") REFERENCES "refund"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "order_modification" ADD CONSTRAINT "FK_ad2991fa2933ed8b7f86a716338" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsVerificationmetadata"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsActiveverifications"`, undefined);
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsSheeridverifications"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."settings_store_key_scope_unique"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_8d8ddb95a0fbd11ffb5606ef0c"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_ab560f7983976aec91b91c26a4"`, undefined);
        await queryRunner.query(`DROP TABLE "settings_store_entry"`, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_deleted_at" ON "customer" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_updated_at" ON "customer" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_created_at" ON "customer" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_customer_email" ON "customer" ("emailAddress") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_deleted_at" ON "product_variant" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_updated_at" ON "product_variant" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_created_at" ON "product_variant" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_sku" ON "product_variant" ("sku") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_variant_enabled" ON "product_variant" ("enabled") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_updated_at" ON "order" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_created_at" ON "order" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_active" ON "order" ("active") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_order_state" ON "order" ("state") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_asset_created_at" ON "asset" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_asset_name" ON "asset" ("name") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_deleted_at" ON "product" ("deletedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_updated_at" ON "product" ("updatedAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_created_at" ON "product" ("createdAt") `, undefined);
        await queryRunner.query(`CREATE INDEX "idx_product_enabled" ON "product" ("enabled") `, undefined);
   }

}
