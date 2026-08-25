import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { EstoqueService } from '../estoque/estoque.service';
import { ConteudoService } from '../conteudo/conteudo.service';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Injectable()
export class AreaClienteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly estoqueService: EstoqueService,
    private readonly conteudoService: ConteudoService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listarMinhasCompras(email: string) {
    return this.prisma.pedido.findMany({
      where: { compradorEmail: email },
      orderBy: { criadoEm: 'desc' },
      include: {
        itens: {
          include: {
            produto: { include: { conteudos: true } },
            devolucoes: true,
          },
        },
      },
    });
  }

  private async obterItemDoComprador(itemPedidoId: string, email: string) {
    const item = await this.prisma.itemPedido.findUnique({
      where: { id: itemPedidoId },
      include: { pedido: true, produto: true },
    });
    if (!item) {
      throw new NotFoundException('Item de pedido não encontrado');
    }
    if (item.pedido.compradorEmail !== email) {
      throw new ForbiddenException(
        'Este item não pertence ao usuário autenticado',
      );
    }
    if (item.pedido.status !== StatusPedido.confirmado) {
      throw new ForbiddenException(
        'O acesso só é liberado após a confirmação do pagamento',
      );
    }
    return item;
  }

  async obterUrlConteudo(
    itemPedidoId: string,
    conteudoId: string,
    email: string,
    ip: string | undefined,
  ) {
    const item = await this.obterItemDoComprador(itemPedidoId, email);

    const conteudo = await this.prisma.conteudoProduto.findFirst({
      where: { id: conteudoId, produtoId: item.produtoId },
    });
    if (!conteudo) {
      throw new NotFoundException('Conteúdo não encontrado para este produto');
    }

    const url = await this.conteudoService.comUrlAssinada([conteudo]);

    // Este é o evento de "uso" que a regra de elegibilidade de devolução consulta — ver DevolucoesService.
    await this.prisma.acessoConteudo.create({
      data: { itemPedidoId: item.id, tipo: 'download', ip },
    });

    return { url: url[0].urlArquivo };
  }

  async obterCodigo(itemPedidoId: string, email: string, usuarioId: string) {
    const item = await this.obterItemDoComprador(itemPedidoId, email);

    if (!item.emitidoEm) {
      return { codigo: null, pronto: false };
    }

    const codigo =
      item.produto.tipoEstoque === 'serializado' && item.unidadeId
        ? await this.estoqueService.obterCodigoDecifrado(item.unidadeId)
        : item.codigoSobDemandaCifrado
          ? this.encryption.decrypt(Buffer.from(item.codigoSobDemandaCifrado))
          : null;

    await this.prisma.acessoConteudo.create({
      data: { itemPedidoId: item.id, tipo: 'visualizacao_codigo' },
    });
    await this.auditoria.registrar({
      usuarioId,
      acao: 'cliente_visualizou_codigo',
      entidade: 'item_pedido',
      entidadeId: item.id,
    });

    return { codigo, pronto: true };
  }
}
