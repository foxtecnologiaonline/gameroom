import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Produto, StatusProduto, StatusUnidade } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  PaginationQueryDto,
  paginar,
} from '../common/pagination/pagination.dto';
import {
  QUEUE_ESTOQUE,
  JOB_GERAR_ESTOQUE_INICIAL,
} from '../jobs/queues.constants';
import { ConteudoService } from '../conteudo/conteudo.service';
import { CriarProdutoDto } from './dto/criar-produto.dto';
import { AtualizarProdutoDto } from './dto/atualizar-produto.dto';

@Injectable()
export class ProdutosService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_ESTOQUE) private readonly estoqueQueue: Queue,
    private readonly conteudoService: ConteudoService,
  ) {}

  async criar(dto: CriarProdutoDto): Promise<Produto> {
    const tipoEstoque = dto.tipoEstoque ?? 'serializado';
    const estoqueLotePadrao = dto.estoqueLotePadrao ?? 300;
    const limiarReabastecimento = dto.limiarReabastecimento ?? 30;

    if (limiarReabastecimento >= estoqueLotePadrao) {
      throw new BadRequestException(
        'limiarReabastecimento deve ser menor que estoqueLotePadrao',
      );
    }

    const produto = await this.prisma.produto.create({
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        preco: dto.preco,
        categoria: dto.categoria,
        tipoEstoque,
        estoqueLotePadrao,
        limiarReabastecimento,
        status: StatusProduto.rascunho,
      },
    });

    if (tipoEstoque === 'serializado') {
      await this.estoqueQueue.add(
        JOB_GERAR_ESTOQUE_INICIAL,
        { produtoId: produto.id, quantidade: estoqueLotePadrao },
        { jobId: `${JOB_GERAR_ESTOQUE_INICIAL}-${produto.id}` },
      );
    }

    return produto;
  }

  async listarAtivos(query: PaginationQueryDto, categoria?: string) {
    const where = {
      status: StatusProduto.ativo,
      ...(categoria ? { categoria } : {}),
    };
    const [dados, total] = await Promise.all([
      this.prisma.produto.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.produto.count({ where }),
    ]);
    return paginar(dados, total, query);
  }

  async listarTodos(query: PaginationQueryDto) {
    const [dados, total] = await Promise.all([
      this.prisma.produto.findMany({
        orderBy: { criadoEm: 'desc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.produto.count(),
    ]);
    return paginar(dados, total, query);
  }

  async obterPorId(id: string) {
    const produto = await this.prisma.produto.findUnique({
      where: { id },
      include: { conteudos: { orderBy: { ordem: 'asc' } } },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }
    const conteudos = await this.conteudoService.comUrlAssinada(
      produto.conteudos,
    );
    return { ...produto, conteudos };
  }

  async atualizar(id: string, dto: AtualizarProdutoDto): Promise<Produto> {
    const produto = await this.prisma.produto.findUnique({ where: { id } });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (
      dto.status === StatusProduto.ativo &&
      produto.status !== StatusProduto.ativo
    ) {
      await this.validarPodeAtivar(produto);
    }

    return this.prisma.produto.update({
      where: { id },
      data: {
        nome: dto.nome,
        descricao: dto.descricao,
        preco: dto.preco,
        categoria: dto.categoria,
        status: dto.status,
        limiarReabastecimento: dto.limiarReabastecimento,
      },
    });
  }

  private async validarPodeAtivar(produto: Produto) {
    if (produto.tipoEstoque !== 'serializado') {
      return;
    }
    const disponiveis = await this.prisma.unidadeEstoque.count({
      where: { produtoId: produto.id, status: StatusUnidade.disponivel },
    });
    if (disponiveis === 0) {
      throw new BadRequestException(
        'Produto serializado não pode ser ativado sem nenhuma unidade "disponivel" — importe códigos antes de ativar.',
      );
    }
  }
}
