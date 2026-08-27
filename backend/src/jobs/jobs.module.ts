import { Module } from '@nestjs/common';
import { QstashClientModule } from './qstash-client.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { ConteudoModule } from '../conteudo/conteudo.module';
import { EmailModule } from '../email/email.module';
import { RefundModule } from '../refund/refund.module';
import { NotaFiscalModule } from '../nota-fiscal/nota-fiscal.module';
import { QstashSignatureGuard } from './qstash-signature.guard';
import { EstoqueJobsController } from './http/estoque-jobs.controller';
import { ReservasJobsController } from './http/reservas-jobs.controller';
import { EmissaoJobsController } from './http/emissao-jobs.controller';
import { DevolucaoJobsController } from './http/devolucao-jobs.controller';
import { NotaFiscalJobsController } from './http/nota-fiscal-jobs.controller';
import { FalhasJobsController } from './http/falhas-jobs.controller';

@Module({
  imports: [
    QstashClientModule,
    EstoqueModule,
    ConteudoModule,
    EmailModule,
    RefundModule,
    NotaFiscalModule,
  ],
  controllers: [
    EstoqueJobsController,
    ReservasJobsController,
    EmissaoJobsController,
    DevolucaoJobsController,
    NotaFiscalJobsController,
    FalhasJobsController,
  ],
  providers: [QstashSignatureGuard],
})
export class JobsModule {}
