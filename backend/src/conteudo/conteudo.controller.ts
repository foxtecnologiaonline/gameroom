import {
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConteudoService } from './conteudo.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';

const TAMANHO_MAXIMO_BYTES = 500 * 1024 * 1024; // 500MB (cobre vídeos)

@Controller('produtos/:produtoId/conteudos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ConteudoController {
  constructor(private readonly conteudoService: ConteudoService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TAMANHO_MAXIMO_BYTES } }),
  )
  criar(
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
    @Body() dto: CriarConteudoDto,
    @UploadedFile() arquivo: Express.Multer.File,
  ) {
    return this.conteudoService.criar(produtoId, dto, arquivo);
  }
}
