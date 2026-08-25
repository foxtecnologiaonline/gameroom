import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CriarPedidoDto } from './dto/criar-pedido.dto';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  criar(@Body() dto: CriarPedidoDto) {
    return this.pedidosService.criar(dto);
  }

  @Get(':id')
  obter(@Param('id', ParseUUIDPipe) id: string) {
    return this.pedidosService.obterPorId(id);
  }

  @Post(':id/cancelar')
  cancelar(@Param('id', ParseUUIDPipe) id: string) {
    return this.pedidosService.cancelar(id);
  }
}
