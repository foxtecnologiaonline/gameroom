import { Module } from '@nestjs/common';
import { ConsoleRefundGateway } from './console-refund.gateway';
import { REFUND_GATEWAY } from './refund-gateway.interface';

@Module({
  providers: [{ provide: REFUND_GATEWAY, useClass: ConsoleRefundGateway }],
  exports: [REFUND_GATEWAY],
})
export class RefundModule {}
