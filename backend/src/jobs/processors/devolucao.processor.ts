import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StatusDevolucao } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  REFUND_GATEWAY,
  RefundGateway,
} from '../../refund/refund-gateway.interface';
import {
  ProcessarDevolucaoJobData,
  QUEUE_DEVOLUCOES,
} from '../queues.constants';

@Processor(QUEUE_DEVOLUCOES)
export class DevolucaoProcessor extends WorkerHost {
  private readonly logger = new Logger(DevolucaoProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(REFUND_GATEWAY) private readonly refundGateway: RefundGateway,
  ) {
    super();
  }

  async process(job: Job<ProcessarDevolucaoJobData>): Promise<void> {
    const { devolucaoId } = job.data;

    const devolucao = await this.prisma.devolucao.findUnique({
      where: { id: devolucaoId },
      include: { itemPedido: { include: { pedido: true, produto: true } } },
    });
    if (!devolucao) {
      this.logger.warn(
        `Devolução ${devolucaoId} não encontrada — job descartado`,
      );
      return;
    }
    if (devolucao.processadoEm) {
      // Idempotente: reentrega do job não solicita um segundo estorno.
      return;
    }
    if (
      devolucao.status !== StatusDevolucao.aprovada_automatica &&
      devolucao.status !== StatusDevolucao.aprovada_manual
    ) {
      this.logger.warn(
        `Devolução ${devolucaoId} não está aprovada (status: ${devolucao.status}) — job descartado`,
      );
      return;
    }

    const { estornoId } = await this.refundGateway.estornar({
      transacaoOriginalId:
        devolucao.itemPedido.pedido.gatewayTransacaoId ??
        devolucao.itemPedido.pedido.id,
      valor: Number(devolucao.itemPedido.valorUnitario),
      motivo: devolucao.motivo ?? undefined,
    });

    await this.prisma.devolucao.update({
      where: { id: devolucao.id },
      data: { estornoGatewayId: estornoId, processadoEm: new Date() },
    });

    await this.emailService.enviarDevolucaoAprovada({
      destinatario: devolucao.itemPedido.pedido.compradorEmail,
      produtoNome: devolucao.itemPedido.produto.nome,
    });
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const esgotouTentativas = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (esgotouTentativas) {
      this.logger.error(
        `ALERTA CRÍTICO: estorno da devolução ${job.data?.devolucaoId} falhou após todas as tentativas — cliente devolveu mas não foi reembolsado. Erro: ${error.message}`,
      );
    }
  }
}
