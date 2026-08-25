import { Module } from '@nestjs/common';
import { QueuesModule } from './queues.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { ConteudoModule } from '../conteudo/conteudo.module';
import { EmailModule } from '../email/email.module';
import { EstoqueProcessor } from './processors/estoque.processor';
import { ReservasProcessor } from './processors/reservas.processor';
import { EmissaoProcessor } from './processors/emissao.processor';
import { EstoqueScheduler } from './estoque.scheduler';

@Module({
  imports: [QueuesModule, EstoqueModule, ConteudoModule, EmailModule],
  providers: [
    EstoqueProcessor,
    ReservasProcessor,
    EmissaoProcessor,
    EstoqueScheduler,
  ],
})
export class JobsModule {}
