import { Module } from '@nestjs/common';
import { QueuesModule } from '../jobs/queues.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { PagamentoService } from './pagamento.service';
import { PagamentoController } from './pagamento.controller';

@Module({
  imports: [QueuesModule, EstoqueModule],
  controllers: [PagamentoController],
  providers: [PagamentoService],
  exports: [PagamentoService],
})
export class PagamentoModule {}
