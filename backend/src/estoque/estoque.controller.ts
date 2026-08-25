import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { EstoqueService } from './estoque.service';
import { ImportarCodigosDto } from './dto/importar-codigos.dto';
import { ListarEstoqueQueryDto } from './dto/listar-estoque-query.dto';

@Controller('admin/estoque')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get(':produtoId')
  listar(
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
    @Query() query: ListarEstoqueQueryDto,
  ) {
    return this.estoqueService.listar(produtoId, query.status, query);
  }

  @Post(':produtoId/importar-codigos')
  importarCodigos(
    @Param('produtoId', ParseUUIDPipe) produtoId: string,
    @Body() dto: ImportarCodigosDto,
  ) {
    return this.estoqueService.importarCodigos(produtoId, dto.codigos);
  }
}
