import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { SellerModule } from '../seller/seller.module';
import { ReservationEntity } from './entities/reservation.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationEntity]),
    CatalogModule,
    SellerModule,
    IdempotencyModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
