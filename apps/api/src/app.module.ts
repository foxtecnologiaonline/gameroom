import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/data-source.options';
import { CatalogModule } from './catalog/catalog.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { InventoryModule } from './inventory/inventory.module';
import { SellerModule } from './seller/seller.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({ useFactory: () => buildDataSourceOptions() }),
    HealthModule,
    IdentityModule,
    SellerModule,
    CatalogModule,
    InventoryModule,
  ],
})
export class AppModule {}
