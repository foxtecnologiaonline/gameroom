import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusDevolucao, StatusPedido, StatusUnidade } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EmailService } from '../email/email.service';
import { JobsPublisherService } from '../jobs/jobs-publisher.service';
import {
  PaginationQueryDto,
  paginar,
} from '../common/pagination/pagination.dto';

/** Prazo de arrependimento — alinhado ao art. 49 do CDC (7 dias corridos). */
const PRAZO_DEVOLUCAO_DIAS = 7;

@Injectable()
export class DevolucoesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoria: AuditoriaService,
    private readonly emailService: EmailService,
    private readonly jobsPublisher: JobsPublisherService,
  ) {}

  async solicitar(
    itemPedidoId: string,
    emailSolicitante: string,
    motivo: string | undefined,
  ) {
    const item = await this.prisma.itemPedido.findUnique({
      where: { id: itemPedidoId },
      include: { pedido: true, devolucoes: true },
    });
    if (!item) {
      throw new NotFoundException('Item de pedido não encontrado');
    }
    if (item.pedido.compradorEmail !== emailSolicitante) {
      throw new ForbiddenException(
        'Este item não pertence ao usuário autenticado',
      );
    }
    if (item.pedido.status !== StatusPedido.confirmado) {
      throw new BadRequestException(
        'Só é possível solicitar devolução de itens de pedidos confirmados',
      );
    }
    if (item.devolucoes.length > 0) {
      throw new BadRequestException(
        'Já existe uma solicitação de devolução para este item',
      );
    }

    const elegivel = await this.verificarElegibilidade(
      item.id,
      item.pedido.confirmadoEm,
    );

    const devolucao = await this.prisma.devolucao.create({
      data: {
        itemPedidoId: item.id,
        motivo,
        status: elegivel
          ? StatusDevolucao.aprovada_automatica
          : StatusDevolucao.pendente,
      },
    });

    if (elegivel) {
      await this.efetivarAprovacao(devolucao.id, item.unidadeId);
    }

    return devolucao;
  }

  private async verificarElegibilidade(
    itemPedidoId: string,
    confirmadoEm: Date | null,
  ): Promise<boolean> {
    if (!confirmadoEm) {
      return false;
    }
    const prazoMs = PRAZO_DEVOLUCAO_DIAS * 24 * 60 * 60 * 1000;
    const dentroDoPrazo = Date.now() - confirmadoEm.getTime() <= prazoMs;
    if (!dentroDoPrazo) {
      return false;
    }

    const algumAcesso = await this.prisma.acessoConteudo.findFirst({
      where: { itemPedidoId },
    });
    return !algumAcesso;
  }

  /**
   * Bloqueia a unidade — não a devolve a `disponivel`, pois o código já foi
   * exposto por e-mail ao comprador e não pode ser revendido com segurança —
   * e enfileira o estorno via job `processar-devolucao`. Usada tanto para a
   * aprovação automática quanto para a decisão manual, sobre o mesmo registro
   * de devolução (o id nunca muda).
   */
  private async efetivarAprovacao(
    devolucaoId: string,
    unidadeId: string | null,
  ): Promise<void> {
    if (unidadeId) {
      await this.prisma.unidadeEstoque.update({
        where: { id: unidadeId },
        data: { status: StatusUnidade.bloqueado },
      });
    }
    await this.jobsPublisher.enfileirarProcessarDevolucao(devolucaoId);
  }

  async decidirManualmente(
    devolucaoId: string,
    adminId: string,
    aprovar: boolean,
    motivoRejeicao?: string,
  ) {
    const devolucao = await this.prisma.devolucao.findUnique({
      where: { id: devolucaoId },
      include: { itemPedido: { include: { pedido: true, produto: true } } },
    });
    if (!devolucao) {
      throw new NotFoundException('Devolução não encontrada');
    }
    if (devolucao.status !== StatusDevolucao.pendente) {
      throw new BadRequestException('Esta devolução já foi decidida');
    }

    if (aprovar) {
      const atualizada = await this.prisma.devolucao.update({
        where: { id: devolucao.id },
        data: { status: StatusDevolucao.aprovada_manual },
      });
      await this.efetivarAprovacao(
        devolucao.id,
        devolucao.itemPedido.unidadeId,
      );
      await this.auditoria.registrar({
        usuarioId: adminId,
        acao: 'aprovou_devolucao_manual',
        entidade: 'devolucao',
        entidadeId: devolucao.id,
      });
      return atualizada;
    }

    const rejeitada = await this.prisma.devolucao.update({
      where: { id: devolucao.id },
      data: { status: StatusDevolucao.rejeitada, processadoEm: new Date() },
    });
    await this.auditoria.registrar({
      usuarioId: adminId,
      acao: 'rejeitou_devolucao_manual',
      entidade: 'devolucao',
      entidadeId: devolucao.id,
    });
    await this.emailService.enviarDevolucaoRejeitada({
      destinatario: devolucao.itemPedido.pedido.compradorEmail,
      produtoNome: devolucao.itemPedido.produto.nome,
      motivo: motivoRejeicao,
    });
    return rejeitada;
  }

  async obterPorId(
    id: string,
    usuario: { email: string; tipo: 'admin' | 'cliente' },
  ) {
    const devolucao = await this.prisma.devolucao.findUnique({
      where: { id },
      include: { itemPedido: { include: { pedido: true, produto: true } } },
    });
    if (!devolucao) {
      throw new NotFoundException('Devolução não encontrada');
    }
    if (
      usuario.tipo !== 'admin' &&
      devolucao.itemPedido.pedido.compradorEmail !== usuario.email
    ) {
      throw new ForbiddenException(
        'Esta devolução não pertence ao usuário autenticado',
      );
    }
    return devolucao;
  }

  async listarRevisaoManual(query: PaginationQueryDto) {
    const where = { status: StatusDevolucao.pendente };
    const [dados, total] = await Promise.all([
      this.prisma.devolucao.findMany({
        where,
        include: { itemPedido: { include: { pedido: true, produto: true } } },
        orderBy: { criadoEm: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.devolucao.count({ where }),
    ]);
    return paginar(dados, total, query);
  }
}
