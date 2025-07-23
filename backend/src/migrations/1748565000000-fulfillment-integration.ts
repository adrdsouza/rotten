import { MigrationInterface, QueryRunner } from 'typeorm';

export class FulfillmentIntegration1748565000000 implements MigrationInterface {
    name = 'FulfillmentIntegration1748565000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create veracore_config table
        await queryRunner.query(`
            CREATE TABLE "veracore_config" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "apiUrl" character varying(255) NOT NULL,
                "clientId" character varying(255) NOT NULL,
                "clientSecret" text NOT NULL,
                "companyId" character varying(255) NOT NULL,
                "accessToken" text,
                "refreshToken" text,
                "tokenExpiresAt" TIMESTAMP,
                "lastInventorySync" TIMESTAMP,
                "lastTrackingSync" TIMESTAMP,
                "syncEnabled" boolean NOT NULL DEFAULT true,
                "inventorySyncIntervalMinutes" integer NOT NULL DEFAULT 30,
                "trackingSyncIntervalMinutes" integer NOT NULL DEFAULT 15,
                "orderSyncTriggerStates" json,
                "webhookConfig" json,
                "syncStats" json,
                CONSTRAINT "PK_veracore_config" PRIMARY KEY ("id")
            )
        `);

        // Create veracore_order_sync table
        await queryRunner.query(`
            CREATE TABLE "veracore_order_sync" (
                "id" SERIAL NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "vendureOrderId" character varying(255) NOT NULL,
                "vendureOrderCode" character varying(255) NOT NULL,
                "veracoreOrderId" character varying(255),
                "syncStatus" character varying NOT NULL DEFAULT 'pending',
                "errorMessage" text,
                "retryCount" integer NOT NULL DEFAULT 0,
                "lastSyncAttempt" TIMESTAMP,
                "lastSuccessfulSync" TIMESTAMP,
                "syncMetadata" json,
                CONSTRAINT "PK_veracore_order_sync" PRIMARY KEY ("id")
            )
        `);

        // Create indexes
        await queryRunner.query(`
            CREATE UNIQUE INDEX "IDX_veracore_order_sync_vendure_order_id" 
            ON "veracore_order_sync" ("vendureOrderId")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_veracore_order_sync_vendure_order_code" 
            ON "veracore_order_sync" ("vendureOrderCode")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_veracore_order_sync_sync_status" 
            ON "veracore_order_sync" ("syncStatus")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_veracore_order_sync_sync_status"`);
        await queryRunner.query(`DROP INDEX "IDX_veracore_order_sync_vendure_order_code"`);
        await queryRunner.query(`DROP INDEX "IDX_veracore_order_sync_vendure_order_id"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "veracore_order_sync"`);
        await queryRunner.query(`DROP TABLE "veracore_config"`);
    }
}
