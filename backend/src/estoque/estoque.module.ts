import { Module } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { EstoqueController } from './estoque.controller';
import { AdminReabastecimentosController } from './admin-reabastecimentos.controller';

@Module({
  controllers: [EstoqueController, AdminReabastecimentosController],
  providers: [EstoqueService],
  exports: [EstoqueService],
})
export class EstoqueModule {}
