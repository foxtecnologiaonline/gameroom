import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerModule } from '../seller/seller.module';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Item 10 complete: GET /orders/:id, GET /sellers/:id/orders and
 * PATCH /suborders/:id/status now live here, alongside the
 * create()/findById()/updateSubOrderStatus() capability built
 * incrementally for items 7-9.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, SubOrderEntity, OrderItemEntity]),
    SellerModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
