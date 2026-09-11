import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from '../orders/orders.module';
import { SellerModule } from '../seller/seller.module';
import { ShipmentEntity } from './entities/shipment.entity';
import { SHIPPING_GATEWAY } from './gateways/shipping.gateway';
import { StubMelhorEnvioGateway } from './gateways/stub-melhor-envio.gateway';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShipmentEntity]),
    OrdersModule,
    SellerModule,
  ],
  controllers: [ShippingController],
  providers: [
    ShippingService,
    { provide: SHIPPING_GATEWAY, useClass: StubMelhorEnvioGateway },
  ],
})
export class ShippingModule {}
