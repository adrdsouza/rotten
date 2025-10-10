import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFields1755912377405 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSaleprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSaleprice" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPreorderprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPreorderprice" integer`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsPreorderprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsPreorderprice" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsSaleprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsSaleprice" double precision`, undefined);
   }

}
