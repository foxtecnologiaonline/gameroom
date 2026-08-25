import { Module } from '@nestjs/common';
import { QueuesModule } from '../jobs/queues.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';

@Module({
  imports: [QueuesModule, EstoqueModule],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
