import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './database/data-source.options';
import { CartModule } from './cart/cart.module';
import { CatalogModule } from './catalog/catalog.module';
import { CheckoutModule } from './checkout/checkout.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SellerModule } from './seller/seller.module';
import { ShippingModule } from './shipping/shipping.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({ useFactory: () => buildDataSourceOptions() }),
    HealthModule,
    IdentityModule,
    SellerModule,
    CatalogModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    CheckoutModule,
    PaymentsModule,
    ShippingModule,
  ],
})
export class AppModule {}
