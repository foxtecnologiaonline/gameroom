import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { OrdersService } from './orders.service';

/**
 * Only the entities and creation path exist here — backlog item 7
 * (checkout) needs Order/SubOrder to exist to do its job. The rest of the
 * `orders` bounded context (GET /orders/:id, GET /sellers/:id/orders,
 * PATCH /suborders/:id/status, the domain event per status transition)
 * is backlog item 10 and is NOT built yet — see pendência no CLAUDE.md.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, SubOrderEntity, OrderItemEntity]),
  ],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
