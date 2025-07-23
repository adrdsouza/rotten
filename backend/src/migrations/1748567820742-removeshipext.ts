import {MigrationInterface, QueryRunner} from "typeorm";

export class Removeshipext1748567820742 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsWeight"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant" DROP COLUMN "customFieldsWeight"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant" ADD "customFieldsWeight" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsWeight" integer`, undefined);
   }

}
