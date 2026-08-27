import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { StatusPedido, StatusUnidade } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import { FraudeService } from '../fraude/fraude.service';
import { JobsPublisherService } from '../jobs/jobs-publisher.service';
import { WebhookPagamentoDto } from './dto/webhook-pagamento.dto';

@Injectable()
export class PagamentoService {
  private readonly logger = new Logger(PagamentoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
    private readonly fraudeService: FraudeService,
    private readonly jobsPublisher: JobsPublisherService,
  ) {}

  async processarWebhook(dto: WebhookPagamentoDto): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
      include: { itens: true },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }

    if (dto.status === 'recusado') {
      await this.tratarRecusa(dto.pedidoId);
      return;
    }

    await this.confirmarPagamentoAprovado(dto);

    const retidoPorFraude = await this.fraudeService.avaliarERegistrarRisco(
      dto.pedidoId,
      pedido.compradorEmail,
    );
    if (!retidoPorFraude) {
      await this.reenfileirarEmissoesPendentes(dto.pedidoId);
      await this.jobsPublisher.enfileirarNotaFiscal(dto.pedidoId);
    }

    await this.dispararReabastecimento(dto.pedidoId);
  }

  private async tratarRecusa(pedidoId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const resultado = await tx.pedido.updateMany({
        where: { id: pedidoId, status: StatusPedido.pendente },
        data: { status: StatusPedido.cancelado },
      });
      if (resultado.count === 0) {
        return;
      }
      const itens = await tx.itemPedido.findMany({ where: { pedidoId } });
      for (const item of itens) {
        if (item.unidadeId) {
          await tx.unidadeEstoque.updateMany({
            where: { id: item.unidadeId, status: StatusUnidade.reservado },
            data: { status: StatusUnidade.disponivel },
          });
        }
      }
    });
  }

  /**
   * Idempotente: se o pedido já estiver confirmado com o mesmo `transacaoId`,
   * não faz nada (tolera reentrega do webhook pelo gateway).
   */
  private async confirmarPagamentoAprovado(
    dto: WebhookPagamentoDto,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const jaConfirmadoComMesmaTransacao = await tx.pedido.findFirst({
        where: {
          id: dto.pedidoId,
          status: StatusPedido.confirmado,
          gatewayTransacaoId: dto.transacaoId,
        },
      });
      if (jaConfirmadoComMesmaTransacao) {
        return;
      }

      const conflito = await tx.pedido.findFirst({
        where: {
          gatewayTransacaoId: dto.transacaoId,
          NOT: { id: dto.pedidoId },
        },
      });
      if (conflito) {
        throw new BadRequestException(
          'transacaoId já associado a outro pedido',
        );
      }

      const resultado = await tx.pedido.updateMany({
        where: { id: dto.pedidoId, status: StatusPedido.pendente },
        data: {
          status: StatusPedido.confirmado,
          confirmadoEm: new Date(),
          gatewayTransacaoId: dto.transacaoId,
        },
      });
      if (resultado.count === 0) {
        // Pedido não está mais pendente (cancelado, ou confirmado por outra transação) — não é seguro prosseguir.
        return;
      }

      const itens = await tx.itemPedido.findMany({
        where: { pedidoId: dto.pedidoId },
      });
      for (const item of itens) {
        if (!item.unidadeId) {
          continue;
        }
        const unidade = await tx.unidadeEstoque.findUnique({
          where: { id: item.unidadeId },
        });
        if (unidade?.status !== StatusUnidade.reservado) {
          // Reserva expirou e a unidade pode ter sido revendida antes do webhook chegar.
          // Caso raro: fica registrado para reconciliação manual em vez de sobrescrever o estoque.
          this.logger.error(
            `ALERTA: item ${item.id} do pedido ${dto.pedidoId} confirmado, mas unidade ${item.unidadeId} não está mais 'reservado' (status atual: ${unidade?.status}). Requer reconciliação manual.`,
          );
          continue;
        }
        await this.estoqueService.confirmarVenda(tx, item.unidadeId);
      }
    });
  }

  private async reenfileirarEmissoesPendentes(pedidoId: string): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { itens: true },
    });
    if (pedido?.status !== StatusPedido.confirmado) {
      return;
    }
    const pendentes = pedido.itens.filter((item) => !item.emitidoEm);
    await Promise.all(
      pendentes.map((item) => this.jobsPublisher.enfileirarEmissao(item.id)),
    );
  }

  private async dispararReabastecimento(pedidoId: string): Promise<void> {
    const itens = await this.prisma.itemPedido.findMany({
      where: { pedidoId },
      include: { produto: true },
    });
    const produtoIds = [
      ...new Set(
        itens
          .filter((i) => i.produto.tipoEstoque === 'serializado')
          .map((i) => i.produtoId),
      ),
    ];
    await Promise.all(
      produtoIds.map((produtoId) =>
        this.jobsPublisher.enfileirarReabastecimento(produtoId),
      ),
    );
  }
}
