import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSeller1789067246828 implements MigrationInterface {
  name = 'InitSeller1789067246828';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // No cross-schema FK to identity.users on purpose: module schemas
    // stay independent so a future split into separate services/DBs
    // (see CLAUDE.md) doesn't require breaking a DB-level constraint.
    // Referential integrity to identity is enforced in SellersService.
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "seller"`);
    await queryRunner.query(
      `CREATE TYPE "seller"."seller_status" AS ENUM('pending', 'approved', 'rejected', 'suspended')`,
    );
    await queryRunner.query(
      `CREATE TABLE "seller"."sellers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "store_name" character varying NOT NULL, "document" character varying NOT NULL, "status" "seller"."seller_status" NOT NULL DEFAULT 'pending', "recipient_id" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "approved_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_97337ccbf692c58e6c7682de8a2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_83f4670f0e114d0be3731bade8" ON "seller"."sellers" ("user_id") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "seller"."IDX_83f4670f0e114d0be3731bade8"`,
    );
    await queryRunner.query(`DROP TABLE "seller"."sellers"`);
    await queryRunner.query(`DROP TYPE "seller"."seller_status"`);
  }
}
