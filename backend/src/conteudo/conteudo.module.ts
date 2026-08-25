import { Module } from '@nestjs/common';
import { ConteudoService } from './conteudo.service';
import { ConteudoController } from './conteudo.controller';
import { StorageService } from './storage.service';

@Module({
  controllers: [ConteudoController],
  providers: [ConteudoService, StorageService],
  exports: [ConteudoService, StorageService],
})
export class ConteudoModule {}
