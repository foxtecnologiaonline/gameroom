import { Module } from '@nestjs/common';
import { JobsPublisherModule } from '../jobs/jobs-publisher.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { FraudeModule } from '../fraude/fraude.module';
import { PagamentoService } from './pagamento.service';
import { PagamentoController } from './pagamento.controller';

@Module({
  imports: [JobsPublisherModule, EstoqueModule, FraudeModule],
  controllers: [PagamentoController],
  providers: [PagamentoService],
  exports: [PagamentoService],
})
export class PagamentoModule {}
