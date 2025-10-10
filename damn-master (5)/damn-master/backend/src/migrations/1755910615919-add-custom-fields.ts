import {MigrationInterface, QueryRunner} from "typeorm";

export class AddCustomFields1755910615919 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsShipdate"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsShipdate" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsShipdate"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsShipdate" TIMESTAMP`, undefined);
   }

}
