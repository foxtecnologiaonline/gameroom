import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { ProdutosService } from './produtos.service';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';
import { ListarProdutosQueryDto } from './dto/listar-produtos-query.dto';

@Controller('produtos')
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  criar(@Body() dto: CriarProdutoDto) {
    return this.produtosService.criar(dto);
  }

  @Get()
  listar(@Query() query: ListarProdutosQueryDto) {
    return this.produtosService.listarAtivos(query, query.categoria);
  }

  @Get('admin/todos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  listarTodos(@Query() query: PaginationQueryDto) {
    return this.produtosService.listarTodos(query);
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.produtosService.obterPorId(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  atualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AtualizarProdutoDto,
  ) {
    return this.produtosService.atualizar(id, dto);
  }
}
