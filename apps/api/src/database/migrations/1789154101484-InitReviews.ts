import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitReviews1789154101484 implements MigrationInterface {
  name = 'InitReviews1789154101484';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "reviews"`);
    await queryRunner.query(
      `CREATE TABLE "reviews"."reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sub_order_id" uuid NOT NULL, "buyer_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "rating" integer NOT NULL, "comment" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_24c0d6d4b88d9b6283c1eb7353e" UNIQUE ("sub_order_id"), CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reviews"."reviews"`);
  }
}
