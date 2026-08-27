import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  StatusDevolucao,
  StatusPedido,
  StatusRetencaoFraude,
  StatusUnidade,
} from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EmailService } from '../email/email.service';
import {
  REFUND_GATEWAY,
  RefundGateway,
} from '../refund/refund-gateway.interface';
import { JobsPublisherService } from '../jobs/jobs-publisher.service';
import {
  PaginationQueryDto,
  paginar,
} from '../common/pagination/pagination.dto';

/** Limiares de risco — heurísticas simples e explicáveis para o MVP (ver §4.8 da especificação v2). */
const LIMITE_PEDIDOS_POR_HORA = 5;
const LIMITE_DEVOLUCOES_EM_30_DIAS = 2;

@Injectable()
export class FraudeService {
  private readonly logger = new Logger(FraudeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly emailService: EmailService,
    @Inject(REFUND_GATEWAY) private readonly refundGateway: RefundGateway,
    private readonly jobsPublisher: JobsPublisherService,
  ) {}

  /**
   * Avalia o pedido recém-confirmado e, se houver sinal de risco, cria uma
   * retenção (a emissão fica suspensa até decisão do admin). Idempotente:
   * uma reentrega do webhook não cria uma segunda retenção para o mesmo pedido.
   */
  async avaliarERegistrarRisco(
    pedidoId: string,
    email: string,
  ): Promise<boolean> {
    const existente = await this.prisma.retencaoFraude.findFirst({
      where: { pedidoId },
    });
    if (existente) {
      return existente.status === StatusRetencaoFraude.pendente;
    }

    const motivo = await this.detectarRisco(email);
    if (!motivo) {
      return false;
    }

    await this.prisma.retencaoFraude.create({ data: { pedidoId, motivo } });
    this.logger.warn(
      `Pedido ${pedidoId} retido para revisão de fraude: ${motivo}`,
    );
    return true;
  }

  private async detectarRisco(email: string): Promise<string | null> {
    const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000);
    const pedidosRecentes = await this.prisma.pedido.count({
      where: {
        compradorEmail: email,
        status: StatusPedido.confirmado,
        confirmadoEm: { gte: umaHoraAtras },
      },
    });
    if (pedidosRecentes >= LIMITE_PEDIDOS_POR_HORA) {
      return `${pedidosRecentes} pedidos confirmados na última hora para este e-mail`;
    }

    const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const devolucoesRecentes = await this.prisma.devolucao.count({
      where: {
        status: {
          in: [
            StatusDevolucao.aprovada_automatica,
            StatusDevolucao.aprovada_manual,
          ],
        },
        criadoEm: { gte: trintaDiasAtras },
        itemPedido: { pedido: { compradorEmail: email } },
      },
    });
    if (devolucoesRecentes >= LIMITE_DEVOLUCOES_EM_30_DIAS) {
      return `${devolucoesRecentes} devoluções aprovadas nos últimos 30 dias para este e-mail`;
    }

    return null;
  }

  async listarPendentes(query: PaginationQueryDto) {
    const where = { status: StatusRetencaoFraude.pendente };
    const [dados, total] = await Promise.all([
      this.prisma.retencaoFraude.findMany({
        where,
        include: {
          pedido: { include: { itens: { include: { produto: true } } } },
        },
        orderBy: { criadoEm: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.retencaoFraude.count({ where }),
    ]);
    return paginar(dados, total, query);
  }

  async decidir(retencaoId: string, adminId: string, liberar: boolean) {
    const retencao = await this.prisma.retencaoFraude.findUnique({
      where: { id: retencaoId },
      include: { pedido: { include: { itens: true } } },
    });
    if (!retencao) {
      throw new NotFoundException('Retenção não encontrada');
    }
    if (retencao.status !== StatusRetencaoFraude.pendente) {
      throw new BadRequestException('Esta retenção já foi decidida');
    }

    if (liberar) {
      return this.liberar(
        retencao.id,
        retencao.pedidoId,
        retencao.pedido.itens,
        adminId,
      );
    }
    return this.bloquear(retencao.id, retencao.pedido, adminId);
  }

  private async liberar(
    retencaoId: string,
    pedidoId: string,
    itens: Array<{ id: string; emitidoEm: Date | null }>,
    adminId: string,
  ) {
    const atualizada = await this.prisma.retencaoFraude.update({
      where: { id: retencaoId },
      data: { status: StatusRetencaoFraude.liberada, decididoEm: new Date() },
    });

    const pendentes = itens.filter((item) => !item.emitidoEm);
    await Promise.all(
      pendentes.map((item) => this.jobsPublisher.enfileirarEmissao(item.id)),
    );

    await this.jobsPublisher.enfileirarNotaFiscal(pedidoId);

    await this.auditoria.registrar({
      usuarioId: adminId,
      acao: 'liberou_pedido_retido_fraude',
      entidade: 'retencao_fraude',
      entidadeId: retencaoId,
    });

    return atualizada;
  }

  private async bloquear(
    retencaoId: string,
    pedido: {
      id: string;
      compradorEmail: string;
      valorTotal: unknown;
      gatewayTransacaoId: string | null;
      itens: Array<{ id: string; unidadeId: string | null }>;
    },
    adminId: string,
  ) {
    const atualizada = await this.prisma.$transaction(async (tx) => {
      const retencaoAtualizada = await tx.retencaoFraude.update({
        where: { id: retencaoId },
        data: {
          status: StatusRetencaoFraude.bloqueada,
          decididoEm: new Date(),
        },
      });
      await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: StatusPedido.estornado },
      });
      for (const item of pedido.itens) {
        if (item.unidadeId) {
          await tx.unidadeEstoque.update({
            where: { id: item.unidadeId },
            data: { status: StatusUnidade.bloqueado },
          });
        }
      }
      return retencaoAtualizada;
    });

    await this.refundGateway.estornar({
      transacaoOriginalId: pedido.gatewayTransacaoId ?? pedido.id,
      valor: Number(pedido.valorTotal),
      motivo: 'Pedido bloqueado por suspeita de fraude',
    });

    await this.emailService.enviarPedidoCanceladoRevisao({
      destinatario: pedido.compradorEmail,
      pedidoId: pedido.id,
    });

    await this.auditoria.registrar({
      usuarioId: adminId,
      acao: 'bloqueou_pedido_retido_fraude',
      entidade: 'retencao_fraude',
      entidadeId: retencaoId,
    });

    return atualizada;
  }
}
