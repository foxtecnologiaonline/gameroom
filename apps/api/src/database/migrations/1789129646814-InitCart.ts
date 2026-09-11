import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCart1789129646814 implements MigrationInterface {
  name = 'InitCart1789129646814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "cart"`);
    await queryRunner.query(
      `CREATE TABLE "cart"."carts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5f695a59f5ebb50af3c8160816" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_eef2fb4d1af19f8cd8a7a069fc" ON "cart"."carts" ("buyer_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart"."cart_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "cart_id" uuid NOT NULL, "offer_id" uuid NOT NULL, "quantity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6fccf5ec03c172d27a28a82928b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_989b30b8e81df1fb44f5b7952a" ON "cart"."cart_items" ("cart_id", "offer_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "cart"."IDX_989b30b8e81df1fb44f5b7952a"`,
    );
    await queryRunner.query(`DROP TABLE "cart"."cart_items"`);
    await queryRunner.query(
      `DROP INDEX "cart"."IDX_eef2fb4d1af19f8cd8a7a069fc"`,
    );
    await queryRunner.query(`DROP TABLE "cart"."carts"`);
  }
}
