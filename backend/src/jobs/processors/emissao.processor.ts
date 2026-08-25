import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { randomUUID } from 'crypto';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { EstoqueService } from '../../estoque/estoque.service';
import { ConteudoService } from '../../conteudo/conteudo.service';
import { EmailService } from '../../email/email.service';
import { EmitirEEntregarJobData, QUEUE_EMISSAO } from '../queues.constants';

@Processor(QUEUE_EMISSAO)
export class EmissaoProcessor extends WorkerHost {
  private readonly logger = new Logger(EmissaoProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
    private readonly conteudoService: ConteudoService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {
    super();
  }

  async process(job: Job<EmitirEEntregarJobData>): Promise<void> {
    const { itemPedidoId } = job.data;

    const item = await this.prisma.itemPedido.findUnique({
      where: { id: itemPedidoId },
      include: { pedido: true, produto: { include: { conteudos: true } } },
    });
    if (!item) {
      this.logger.warn(
        `Item de pedido ${itemPedidoId} não encontrado — job descartado`,
      );
      return;
    }
    if (item.emitidoEm) {
      // Idempotente: reentrega do job (retry ou webhook duplicado) não reenvia e-mail.
      return;
    }
    if (item.pedido.status !== StatusPedido.confirmado) {
      this.logger.warn(
        `Item ${itemPedidoId} ainda não está com pedido confirmado — job será reprocessado`,
      );
      throw new Error('Pedido ainda não confirmado');
    }

    const codigo = await this.obterOuGerarCodigo(item);
    const conteudosComUrl = await this.conteudoService.comUrlAssinada(
      item.produto.conteudos,
    );

    await this.emailService.enviarEmissao({
      destinatario: item.pedido.compradorEmail,
      produtoNome: item.produto.nome,
      codigo,
      conteudos: conteudosComUrl,
    });

    await this.prisma.itemPedido.update({
      where: { id: item.id },
      data: { emitidoEm: new Date() },
    });
  }

  private async obterOuGerarCodigo(item: {
    id: string;
    unidadeId: string | null;
    produto: { tipoEstoque: string };
  }): Promise<string | null> {
    if (item.produto.tipoEstoque === 'serializado') {
      return item.unidadeId
        ? this.estoqueService.obterCodigoDecifrado(item.unidadeId)
        : null;
    }

    // sob_demanda: gera um token de acesso on-the-fly.
    // Ponto de integração para um fornecedor real de chaves/licenças (ver §12 da especificação v2).
    const token = randomUUID();
    await this.prisma.itemPedido.update({
      where: { id: item.id },
      data: {
        codigoSobDemandaCifrado: Uint8Array.from(
          this.encryption.encrypt(token),
        ),
      },
    });
    return token;
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    const esgotouTentativas = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (esgotouTentativas) {
      this.logger.error(
        `ALERTA CRÍTICO: emissão do item ${job.data?.itemPedidoId} falhou após todas as tentativas — pedido pago sem entrega. Erro: ${error.message}`,
      );
    }
  }
}
