import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { ConteudoModule } from '../conteudo/conteudo.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AreaClienteService } from './area-cliente.service';
import { AreaClienteController } from './area-cliente.controller';

@Module({
  imports: [EstoqueModule, ConteudoModule, AuditoriaModule],
  controllers: [AreaClienteController],
  providers: [AreaClienteService],
})
export class AreaClienteModule {}
