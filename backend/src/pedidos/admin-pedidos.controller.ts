import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PedidosService } from './pedidos.service';
import { ListarPedidosQueryDto } from './dto/listar-pedidos-query.dto';

/** Relatório de vendas do painel admin. */
@Controller('admin/pedidos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  listar(@Query() query: ListarPedidosQueryDto) {
    return this.pedidosService.listarTodosAdmin(query);
  }
}
