import { Module } from '@nestjs/common';
import { JobsPublisherModule } from '../jobs/jobs-publisher.module';
import { ProdutosService } from './produtos.service';
import { ProdutosController } from './produtos.controller';

@Module({
  imports: [JobsPublisherModule],
  controllers: [ProdutosController],
  providers: [ProdutosService],
  exports: [ProdutosService],
})
export class ProdutosModule {}
