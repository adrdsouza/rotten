import {MigrationInterface, QueryRunner} from "typeorm";

export class Backtoworking1748564359896 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "search_index_item" ADD "inStock" boolean NOT NULL DEFAULT true`, undefined);
        await queryRunner.query(`ALTER TABLE "search_index_item" ADD "productInStock" boolean NOT NULL DEFAULT true`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "search_index_item" DROP COLUMN "productInStock"`, undefined);
        await queryRunner.query(`ALTER TABLE "search_index_item" DROP COLUMN "inStock"`, undefined);
   }

}
