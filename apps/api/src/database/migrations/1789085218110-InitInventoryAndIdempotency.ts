import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitInventoryAndIdempotency1789085218110 implements MigrationInterface {
  name = 'InitInventoryAndIdempotency1789085218110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "platform"`);
    await queryRunner.query(
      `CREATE TYPE "platform"."idempotency_status" AS ENUM('processing', 'completed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "platform"."idempotency_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "key" character varying NOT NULL, "method" character varying NOT NULL, "path" character varying NOT NULL, "status" "platform"."idempotency_status" NOT NULL, "response_status" integer, "response_body" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8ad20779ad0411107a56e53d0f6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_f18cf76f71ab89b534840a72d7" ON "platform"."idempotency_keys" ("key", "method", "path") `,
    );
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "inventory"`);
    await queryRunner.query(
      `CREATE TYPE "inventory"."reservation_status" AS ENUM('active', 'released')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory"."reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "offer_id" uuid NOT NULL, "quantity" integer NOT NULL, "status" "inventory"."reservation_status" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "released_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "catalog"."offers" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "catalog"."offers" DROP COLUMN "version"`,
    );
    await queryRunner.query(`DROP TABLE "inventory"."reservations"`);
    await queryRunner.query(`DROP TYPE "inventory"."reservation_status"`);
    await queryRunner.query(
      `DROP INDEX "platform"."IDX_f18cf76f71ab89b534840a72d7"`,
    );
    await queryRunner.query(`DROP TABLE "platform"."idempotency_keys"`);
    await queryRunner.query(`DROP TYPE "platform"."idempotency_status"`);
  }
}
