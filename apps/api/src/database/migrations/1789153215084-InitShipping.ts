import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitShipping1789153215084 implements MigrationInterface {
  name = 'InitShipping1789153215084';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "shipping"`);
    await queryRunner.query(
      `CREATE TYPE "shipping"."shipment_status" AS ENUM('label_created', 'in_transit', 'delivered')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shipping"."shipments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sub_order_id" uuid NOT NULL, "carrier" character varying NOT NULL, "tracking_code" character varying NOT NULL, "status" "shipping"."shipment_status" NOT NULL DEFAULT 'label_created', "eta_days" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6deda4532ac542a93eab214b564" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe620f7be7bbab76ad9919698d" ON "shipping"."shipments" ("sub_order_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "shipping"."IDX_fe620f7be7bbab76ad9919698d"`,
    );
    await queryRunner.query(`DROP TABLE "shipping"."shipments"`);
    await queryRunner.query(`DROP TYPE "shipping"."shipment_status"`);
  }
}
