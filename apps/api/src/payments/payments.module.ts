import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';
import { OrdersModule } from '../orders/orders.module';
import { SellerModule } from '../seller/seller.module';
import { PaymentEntity } from './entities/payment.entity';
import { SplitTransactionEntity } from './entities/split-transaction.entity';
import { PAYMENT_GATEWAY } from './gateways/payment.gateway';
import { StubPaymentGateway } from './gateways/stub-payment.gateway';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, SplitTransactionEntity]),
    OrdersModule,
    SellerModule,
    IdempotencyModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_GATEWAY, useClass: StubPaymentGateway },
  ],
})
export class PaymentsModule {}
