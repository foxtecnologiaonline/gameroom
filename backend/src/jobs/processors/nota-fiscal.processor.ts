import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NOTA_FISCAL_PROVIDER,
  NotaFiscalProvider,
} from '../../nota-fiscal/nota-fiscal-provider.interface';
import {
  EmitirNotaFiscalJobData,
  QUEUE_NOTA_FISCAL,
} from '../queues.constants';

@Processor(QUEUE_NOTA_FISCAL)
export class NotaFiscalProcessor extends WorkerHost {
  private readonly logger = new Logger(NotaFiscalProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTA_FISCAL_PROVIDER)
    private readonly notaFiscalProvider: NotaFiscalProvider,
  ) {
    super();
  }

  async process(job: Job<EmitirNotaFiscalJobData>): Promise<void> {
    const { pedidoId } = job.data;

    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
    });
    if (!pedido) {
      this.logger.warn(
        `Pedido ${pedidoId} não encontrado — job de nota fiscal descartado`,
      );
      return;
    }
    if (pedido.notaFiscalId) {
      // Idempotente: reentrega do job não emite uma segunda nota.
      return;
    }
    if (pedido.status !== StatusPedido.confirmado) {
      this.logger.warn(
        `Pedido ${pedidoId} não está confirmado — job de nota fiscal descartado`,
      );
      return;
    }

    const { notaFiscalId } = await this.notaFiscalProvider.emitir({
      pedidoId: pedido.id,
      valor: Number(pedido.valorTotal),
      compradorEmail: pedido.compradorEmail,
    });

    await this.prisma.pedido.update({
      where: { id: pedidoId },
      data: { notaFiscalId },
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const esgotouTentativas = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (esgotouTentativas) {
      this.logger.error(
        `ALERTA: emissão de nota fiscal do pedido ${job.data?.pedidoId} falhou após todas as tentativas. Erro: ${error.message}`,
      );
    }
  }
}
