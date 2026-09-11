import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitOrders1789129983564 implements MigrationInterface {
  name = 'InitOrders1789129983564';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "orders"`);
    await queryRunner.query(
      `CREATE TYPE "orders"."sub_order_status" AS ENUM('pending', 'paid', 'shipped', 'delivered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders"."sub_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "subtotal_cents" integer NOT NULL, "shipping_cents" integer NOT NULL DEFAULT '0', "status" "orders"."sub_order_status" NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_909d792a7f7b751a851223dee9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders"."order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sub_order_id" uuid NOT NULL, "offer_id" uuid NOT NULL, "qty" integer NOT NULL, "unit_price_cents" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "orders"."orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "buyer_id" uuid NOT NULL, "total_cents" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "orders"."orders"`);
    await queryRunner.query(`DROP TABLE "orders"."order_items"`);
    await queryRunner.query(`DROP TABLE "orders"."sub_orders"`);
    await queryRunner.query(`DROP TYPE "orders"."sub_order_status"`);
  }
}
