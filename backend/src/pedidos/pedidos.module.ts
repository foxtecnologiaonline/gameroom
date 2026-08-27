import { Module } from '@nestjs/common';
import { JobsPublisherModule } from '../jobs/jobs-publisher.module';
import { EstoqueModule } from '../estoque/estoque.module';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { AdminPedidosController } from './admin-pedidos.controller';

@Module({
  imports: [JobsPublisherModule, EstoqueModule],
  controllers: [PedidosController, AdminPedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
