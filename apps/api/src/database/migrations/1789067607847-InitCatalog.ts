import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitCatalog1789067607847 implements MigrationInterface {
  name = 'InitCatalog1789067607847';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "catalog"`);
    await queryRunner.query(
      `CREATE TYPE "catalog"."offer_condition" AS ENUM('new', 'used')`,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog"."offers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "product_id" uuid NOT NULL, "seller_id" uuid NOT NULL, "price_cents" integer NOT NULL, "stock" integer NOT NULL, "condition" "catalog"."offer_condition" NOT NULL, "sla_days" integer NOT NULL, "is_buybox_winner" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4c88e956195bba85977da21b8f4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog"."categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_420d9f679d41281f282f5bc7d0" ON "catalog"."categories" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "catalog"."products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "description" text NOT NULL, "category_id" uuid NOT NULL, "brand" character varying, "attributes" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );

    // Reference data: no endpoint creates categories in the MVP (see
    // section 1 of the spec), so the handful the storefront needs are
    // seeded here instead of built as a full CRUD surface.
    await queryRunner.query(`
            INSERT INTO "catalog"."categories" ("name", "slug") VALUES
                ('Jogos', 'jogos'),
                ('Contas', 'contas'),
                ('Colecionáveis', 'colecionaveis'),
                ('Skins', 'skins'),
                ('Ferramentas', 'ferramentas')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "catalog"."products"`);
    await queryRunner.query(
      `DROP INDEX "catalog"."IDX_420d9f679d41281f282f5bc7d0"`,
    );
    await queryRunner.query(`DROP TABLE "catalog"."categories"`);
    await queryRunner.query(`DROP TABLE "catalog"."offers"`);
    await queryRunner.query(`DROP TYPE "catalog"."offer_condition"`);
  }
}
