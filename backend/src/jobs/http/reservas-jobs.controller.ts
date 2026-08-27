import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstoqueService } from '../../estoque/estoque.service';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import { LiberarReservaExpiradaJobDto } from '../dto/job-payloads.dto';

/** Corpo é o mesmo do antigo ReservasProcessor.process(). */
@Controller('jobs/reservas')
@UseGuards(QstashSignatureGuard)
export class ReservasJobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {}

  @Post('liberar-reserva-expirada')
  @HttpCode(200)
  async liberarReservaExpirada(
    @Body() dto: LiberarReservaExpiradaJobDto,
  ): Promise<void> {
    const item = await this.prisma.itemPedido.findUnique({
      where: { id: dto.itemPedidoId },
      include: { pedido: true },
    });
    if (!item || !item.unidadeId) {
      return;
    }
    if (item.pedido.status !== StatusPedido.pendente) {
      // Pagamento já foi confirmado ou o pedido já foi cancelado — nada a liberar.
      return;
    }

    await this.estoqueService.liberarReservaSeExpirada(item.unidadeId);
  }
}
