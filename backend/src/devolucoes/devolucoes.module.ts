import { Module } from '@nestjs/common';
import { QueuesModule } from '../jobs/queues.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { EmailModule } from '../email/email.module';
import { DevolucoesService } from './devolucoes.service';
import { DevolucoesController } from './devolucoes.controller';
import { AdminDevolucoesController } from './admin-devolucoes.controller';

@Module({
  imports: [QueuesModule, AuditoriaModule, EmailModule],
  controllers: [DevolucoesController, AdminDevolucoesController],
  providers: [DevolucoesService],
  exports: [DevolucoesService],
})
export class DevolucoesModule {}
