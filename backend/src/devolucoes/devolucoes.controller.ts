import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { DevolucoesService } from './devolucoes.service';
import { SolicitarDevolucaoDto } from './dto/solicitar-devolucao.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevolucoesController {
  constructor(private readonly devolucoesService: DevolucoesService) {}

  @Post('itens-pedido/:itemPedidoId/devolucoes')
  @Roles('cliente')
  solicitar(
    @Param('itemPedidoId', ParseUUIDPipe) itemPedidoId: string,
    @Body() dto: SolicitarDevolucaoDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.devolucoesService.solicitar(
      itemPedidoId,
      usuario.email,
      dto.motivo,
    );
  }

  @Get('devolucoes/:id')
  @Roles('admin', 'cliente')
  obter(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.devolucoesService.obterPorId(id, usuario);
  }
}
