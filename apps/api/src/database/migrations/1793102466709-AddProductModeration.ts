import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductModeration1793102466709 implements MigrationInterface {
  name = 'AddProductModeration1793102466709';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog"."products" ADD "suspended_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog"."products" DROP COLUMN "suspended_at"`,
    );
  }
}
