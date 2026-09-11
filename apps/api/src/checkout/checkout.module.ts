import { Module } from '@nestjs/common';
import { CartModule } from '../cart/cart.module';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [CartModule, InventoryModule, OrdersModule, IdempotencyModule],
  controllers: [CheckoutController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
