import { MigrationInterface, QueryRunner } from 'typeorm';

export class StripeErrorHandling1759200000000 implements MigrationInterface {
    name = 'StripeErrorHandling1759200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add new columns to pending_stripe_payment table for error handling
        await queryRunner.query(`
            ALTER TABLE "pending_stripe_payment" 
            ADD COLUMN "currency" varchar,
            ADD COLUMN "failedAt" timestamp,
            ADD COLUMN "failureReason" varchar,
            ADD COLUMN "failureType" varchar,
            ADD COLUMN "isRetryable" boolean,
            ADD COLUMN "retryCount" integer DEFAULT 0,
            ADD COLUMN "manualSettlement" boolean DEFAULT false,
            ADD COLUMN "settledBy" varchar,
            ADD COLUMN "canceledBy" varchar
        `);

        // Add indexes for better query performance
        await queryRunner.query(`
            CREATE INDEX "IDX_pending_stripe_payment_status" 
            ON "pending_stripe_payment" ("status")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_pending_stripe_payment_created_at" 
            ON "pending_stripe_payment" ("createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_pending_stripe_payment_failed_at" 
            ON "pending_stripe_payment" ("failedAt")
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_pending_stripe_payment_retryable" 
            ON "pending_stripe_payment" ("isRetryable", "status")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_pending_stripe_payment_retryable"`);
        await queryRunner.query(`DROP INDEX "IDX_pending_stripe_payment_failed_at"`);
        await queryRunner.query(`DROP INDEX "IDX_pending_stripe_payment_created_at"`);
        await queryRunner.query(`DROP INDEX "IDX_pending_stripe_payment_status"`);

        // Drop columns
        await queryRunner.query(`
            ALTER TABLE "pending_stripe_payment" 
            DROP COLUMN "currency",
            DROP COLUMN "failedAt",
            DROP COLUMN "failureReason",
            DROP COLUMN "failureType",
            DROP COLUMN "isRetryable",
            DROP COLUMN "retryCount",
            DROP COLUMN "manualSettlement",
            DROP COLUMN "settledBy",
            DROP COLUMN "canceledBy"
        `);
    }
}