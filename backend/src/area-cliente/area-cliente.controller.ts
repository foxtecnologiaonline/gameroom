import {
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { AreaClienteService } from './area-cliente.service';

@Controller('minhas-compras')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('cliente')
export class AreaClienteController {
  constructor(private readonly areaClienteService: AreaClienteService) {}

  @Get()
  listar(@CurrentUser() usuario: JwtPayload) {
    return this.areaClienteService.listarMinhasCompras(usuario.email);
  }

  @Get('itens/:itemPedidoId/conteudos/:conteudoId')
  obterUrlConteudo(
    @Param('itemPedidoId', ParseUUIDPipe) itemPedidoId: string,
    @Param('conteudoId', ParseUUIDPipe) conteudoId: string,
    @CurrentUser() usuario: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.areaClienteService.obterUrlConteudo(
      itemPedidoId,
      conteudoId,
      usuario.email,
      ip,
    );
  }

  @Get('itens/:itemPedidoId/codigo')
  obterCodigo(
    @Param('itemPedidoId', ParseUUIDPipe) itemPedidoId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.areaClienteService.obterCodigo(
      itemPedidoId,
      usuario.email,
      usuario.sub,
    );
  }
}
