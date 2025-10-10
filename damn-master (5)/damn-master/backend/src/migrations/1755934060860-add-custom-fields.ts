import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomFields1755934060860 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPricing"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSaleprice" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPreorderprice" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsShipdate" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsShipdate"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPreorderprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSaleprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPricing" jsonb`, undefined);
   }

}
