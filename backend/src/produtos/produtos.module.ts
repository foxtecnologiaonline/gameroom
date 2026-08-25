import { Module } from '@nestjs/common';
import { QueuesModule } from '../jobs/queues.module';
import { ConteudoModule } from '../conteudo/conteudo.module';
import { ProdutosService } from './produtos.service';
import { ProdutosController } from './produtos.controller';

@Module({
  imports: [QueuesModule, ConteudoModule],
  controllers: [ProdutosController],
  providers: [ProdutosService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
