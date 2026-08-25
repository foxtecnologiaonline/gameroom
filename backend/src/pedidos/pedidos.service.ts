import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma, StatusPedido, StatusProduto } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EstoqueService } from '../estoque/estoque.service';
import {
  QUEUE_RESERVAS,
  JOB_LIBERAR_RESERVA_EXPIRADA,
} from '../jobs/queues.constants';
import { CriarPedidoDto } from './dto/criar-pedido.dto';

@Injectable()
export class PedidosService {
  private readonly reservaExpiracaoMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
    private readonly config: ConfigService,
    @InjectQueue(QUEUE_RESERVAS) private readonly reservasQueue: Queue,
  ) {
    const minutos = Number(
      this.config.get<string>('RESERVA_EXPIRACAO_MINUTOS') ?? 15,
    );
    this.reservaExpiracaoMs = minutos * 60 * 1000;
  }

  async criar(dto: CriarPedidoDto) {
    const produtoIds = [...new Set(dto.itens.map((i) => i.produtoId))];
    const produtos = await this.prisma.produto.findMany({
      where: { id: { in: produtoIds } },
    });
    const produtoPorId = new Map(produtos.map((p) => [p.id, p]));

    for (const item of dto.itens) {
      const produto = produtoPorId.get(item.produtoId);
      if (!produto || produto.status !== StatusProduto.ativo) {
        throw new BadRequestException(
          `Produto ${item.produtoId} não está disponível para venda`,
        );
      }
    }

    const valorTotal = dto.itens.reduce((soma, item) => {
      const produto = produtoPorId.get(item.produtoId)!;
      return soma + Number(produto.preco) * item.quantidade;
    }, 0);

    const itensParaAgendarExpiracao: string[] = [];

    const pedido = await this.prisma.$transaction(async (tx) => {
      const novoPedido = await tx.pedido.create({
        data: {
          compradorEmail: dto.compradorEmail,
          valorTotal,
          status: StatusPedido.pendente,
        },
      });

      for (const item of dto.itens) {
        const produto = produtoPorId.get(item.produtoId)!;
        for (let i = 0; i < item.quantidade; i++) {
          if (produto.tipoEstoque === 'serializado') {
            const unidadeId =
              await this.estoqueService.reservarUnidadeDisponivel(
                tx,
                produto.id,
              );
            if (!unidadeId) {
              throw new BadRequestException(
                `Estoque insuficiente para o produto "${produto.nome}"`,
              );
            }
            const reservadoAte = new Date(Date.now() + this.reservaExpiracaoMs);
            const itemPedido = await tx.itemPedido.create({
              data: {
                pedidoId: novoPedido.id,
                produtoId: produto.id,
                unidadeId,
                valorUnitario: produto.preco,
                reservadoAte,
              },
            });
            itensParaAgendarExpiracao.push(itemPedido.id);
          } else {
            await tx.itemPedido.create({
              data: {
                pedidoId: novoPedido.id,
                produtoId: produto.id,
                valorUnitario: produto.preco,
              },
            });
          }
        }
      }

      return novoPedido;
    });

    await Promise.all(
      itensParaAgendarExpiracao.map((itemPedidoId) =>
        this.reservasQueue.add(
          JOB_LIBERAR_RESERVA_EXPIRADA,
          { itemPedidoId },
          {
            delay: this.reservaExpiracaoMs,
            jobId: `${JOB_LIBERAR_RESERVA_EXPIRADA}-${itemPedidoId}`,
          },
        ),
      ),
    );

    return this.obterPorId(pedido.id);
  }

  async obterPorId(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: { itens: { include: { produto: true } } },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    return pedido;
  }

  async cancelar(id: string) {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id },
      include: { itens: true },
    });
    if (!pedido) {
      throw new NotFoundException('Pedido não encontrado');
    }
    if (pedido.status !== StatusPedido.pendente) {
      throw new BadRequestException('Só é possível cancelar pedidos pendentes');
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pedido.update({
        where: { id },
        data: { status: StatusPedido.cancelado },
      });
      for (const item of pedido.itens) {
        if (item.unidadeId) {
          await tx.unidadeEstoque.updateMany({
            where: { id: item.unidadeId, status: 'reservado' },
            data: { status: 'disponivel' },
          });
        }
      }
    });

    return this.obterPorId(id);
  }
}
