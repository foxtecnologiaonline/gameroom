import { Module } from '@nestjs/common';
import { QueuesModule } from './queues.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { ConteudoModule } from '../conteudo/conteudo.module';
import { EmailModule } from '../email/email.module';
import { RefundModule } from '../refund/refund.module';
import { NotaFiscalModule } from '../nota-fiscal/nota-fiscal.module';
import { EstoqueProcessor } from './processors/estoque.processor';
import { ReservasProcessor } from './processors/reservas.processor';
import { EmissaoProcessor } from './processors/emissao.processor';
import { DevolucaoProcessor } from './processors/devolucao.processor';
import { NotaFiscalProcessor } from './processors/nota-fiscal.processor';
import { EstoqueScheduler } from './estoque.scheduler';

@Module({
  imports: [
    QueuesModule,
    EstoqueModule,
    ConteudoModule,
    EmailModule,
    RefundModule,
    NotaFiscalModule,
  ],
  providers: [
    EstoqueProcessor,
    ReservasProcessor,
    EmissaoProcessor,
    DevolucaoProcessor,
    NotaFiscalProcessor,
    EstoqueScheduler,
  ],
})
export class JobsModule {}
