import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitPayments1789130466736 implements MigrationInterface {
  name = 'InitPayments1789130466736';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "payments"`);
    await queryRunner.query(
      `CREATE TYPE "payments"."payment_status" AS ENUM('pending', 'paid', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments"."split_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "payment_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "amount_cents" integer NOT NULL, "fee_cents" integer NOT NULL DEFAULT '0', "status" "payments"."payment_status" NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_30f74d2a368f8d4387a2f53ad71" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "payments"."payment_method" AS ENUM('credit_card', 'pix')`,
    );
    await queryRunner.query(
      `CREATE TABLE "payments"."payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "gateway_id" character varying NOT NULL, "status" "payments"."payment_status" NOT NULL, "method" "payments"."payment_method" NOT NULL, "total_cents" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b2f7b823a21562eeca20e72b00" ON "payments"."payments" ("order_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b3a65642bddf8d5c40e543a70c" ON "payments"."payments" ("gateway_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "payments"."IDX_b3a65642bddf8d5c40e543a70c"`,
    );
    await queryRunner.query(
      `DROP INDEX "payments"."IDX_b2f7b823a21562eeca20e72b00"`,
    );
    await queryRunner.query(`DROP TABLE "payments"."payments"`);
    await queryRunner.query(`DROP TYPE "payments"."payment_method"`);
    await queryRunner.query(`DROP TABLE "payments"."split_transactions"`);
    await queryRunner.query(`DROP TYPE "payments"."payment_status"`);
  }
}
