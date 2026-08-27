import { Module } from '@nestjs/common';
import { JobsPublisherModule } from '../jobs/jobs-publisher.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { EmailModule } from '../email/email.module';
import { DevolucoesService } from './devolucoes.service';
import { DevolucoesController } from './devolucoes.controller';
import { AdminDevolucoesController } from './admin-devolucoes.controller';

@Module({
  imports: [JobsPublisherModule, AuditoriaModule, EmailModule],
  controllers: [DevolucoesController, AdminDevolucoesController],
  providers: [DevolucoesService],
  exports: [DevolucoesService],
})
export class DevolucoesModule {}
