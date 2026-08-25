import { Module } from '@nestjs/common';
import { QueuesModule } from '../jobs/queues.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { EmailModule } from '../email/email.module';
import { RefundModule } from '../refund/refund.module';
import { FraudeService } from './fraude.service';
import { AdminFraudeController } from './admin-fraude.controller';

@Module({
  imports: [QueuesModule, AuditoriaModule, EmailModule, RefundModule],
  controllers: [AdminFraudeController],
  providers: [FraudeService],
  exports: [FraudeService],
})
export class FraudeModule {}
