import { DataSourceOptions } from 'typeorm';

/**
 * Reads process.env at call time (not at module-load time) so it works
 * both from the TypeORM CLI (which loads .env itself before calling this)
 * and from Nest's ConfigModule (which has already loaded .env by the time
 * TypeOrmModule.forRootAsync's factory runs).
 */
export function buildDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    synchronize: false,
  };
}
