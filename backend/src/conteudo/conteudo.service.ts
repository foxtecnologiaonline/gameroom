import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from './storage.service';
import { CriarConteudoDto } from './dto/criar-conteudo.dto';

@Injectable()
export class ConteudoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async criar(
    produtoId: string,
    dto: CriarConteudoDto,
    arquivo: Express.Multer.File,
  ) {
    const produto = await this.prisma.produto.findUnique({
      where: { id: produtoId },
    });
    if (!produto) {
      throw new NotFoundException('Produto não encontrado');
    }

    const key = await this.storage.upload(produtoId, arquivo);

    return this.prisma.conteudoProduto.create({
      data: {
        produtoId,
        tipo: dto.tipo,
        titulo: dto.titulo,
        ordem: dto.ordem ?? 0,
        urlArquivo: key,
      },
    });
  }

  async listarPorProduto(produtoId: string) {
    return this.prisma.conteudoProduto.findMany({
      where: { produtoId },
      orderBy: { ordem: 'asc' },
    });
  }

  /** Troca a chave interna do objeto por uma URL assinada de curta duração, pronta para o cliente. */
  async comUrlAssinada<T extends { urlArquivo: string }>(
    conteudos: T[],
  ): Promise<T[]> {
    return Promise.all(
      conteudos.map(async (c) => ({
        ...c,
        urlArquivo: await this.storage.urlAssinada(c.urlArquivo),
      })),
    );
  }
}
