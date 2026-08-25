import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstoqueService } from '../../estoque/estoque.service';
import {
  LiberarReservaExpiradaJobData,
  QUEUE_RESERVAS,
} from '../queues.constants';

@Processor(QUEUE_RESERVAS)
export class ReservasProcessor extends WorkerHost {
  private readonly logger = new Logger(ReservasProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
  ) {
    super();
  }

  async process(job: Job<LiberarReservaExpiradaJobData>): Promise<void> {
    const { itemPedidoId } = job.data;
    const item = await this.prisma.itemPedido.findUnique({
      where: { id: itemPedidoId },
      include: { pedido: true },
    });
    if (!item || !item.unidadeId) {
      return;
    }
    if (item.pedido.status !== StatusPedido.pendente) {
      // Pagamento já foi confirmado ou o pedido já foi cancelado — nada a liberar.
      return;
    }

    const liberou = await this.estoqueService.liberarReservaSeExpirada(
      item.unidadeId,
    );
    if (liberou) {
      this.logger.log(
        `Reserva expirada liberada: item ${itemPedidoId}, unidade ${item.unidadeId}`,
      );
    }
  }
}
