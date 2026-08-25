import { Injectable, Logger } from '@nestjs/common';
import { Prisma, StatusUnidade } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import {
  PaginationQueryDto,
  paginar,
} from '../common/pagination/pagination.dto';

type Tx = Prisma.TransactionClient;

export interface ImportarCodigosResultado {
  importados: number;
  duplicados: number;
  ignoradosSemVaga: number;
}

@Injectable()
export class EstoqueService {
  private readonly logger = new Logger(EstoqueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /** Gera `quantidade` unidades em uma única transação (equivalente ao generate_series da spec). */
  async gerarLote(
    produtoId: string,
    quantidade: number,
    tx: Tx | PrismaService = this.prisma,
  ) {
    const dados = Array.from({ length: quantidade }, () => ({
      produtoId,
      status: StatusUnidade.aguardando_codigo,
    }));
    await tx.unidadeEstoque.createMany({ data: dados });
  }

  async contarDisponiveis(
    produtoId: string,
    tx: Tx | PrismaService = this.prisma,
  ): Promise<number> {
    return tx.unidadeEstoque.count({
      where: { produtoId, status: StatusUnidade.disponivel },
    });
  }

  async listar(
    produtoId: string,
    status: StatusUnidade | undefined,
    query: PaginationQueryDto,
  ) {
    const where = { produtoId, ...(status ? { status } : {}) };
    const [dados, total] = await Promise.all([
      this.prisma.unidadeEstoque.findMany({
        where,
        select: {
          id: true,
          status: true,
          criadoEm: true,
          atualizadoEm: true,
          codigoHash: true,
        },
        orderBy: { criadoEm: 'asc' },
        skip: query.skip,
        take: query.take,
      }),
      this.prisma.unidadeEstoque.count({ where }),
    ]);
    return paginar(
      dados.map((u) => ({ ...u, temCodigo: !!u.codigoHash })),
      total,
      query,
    );
  }

  /**
   * Importa códigos reais (de um fornecedor) preenchendo unidades que estão
   * `aguardando_codigo`. Duplicidade é detectada pelo hash sem decifrar nada.
   */
  async importarCodigos(
    produtoId: string,
    codigos: string[],
  ): Promise<ImportarCodigosResultado> {
    let importados = 0;
    let duplicados = 0;
    let ignoradosSemVaga = 0;

    for (const codigo of codigos) {
      const codigoHash = this.encryption.hash(codigo);
      const codigoCifrado = this.encryption.encrypt(codigo);

      try {
        const resultado = await this.prisma.$transaction(async (tx) => {
          const vaga = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM unidades_estoque
            WHERE produto_id = ${produtoId}::uuid AND status = 'aguardando_codigo'
            LIMIT 1
            FOR UPDATE SKIP LOCKED
          `);
          if (vaga.length === 0) {
            return 'sem_vaga' as const;
          }
          await tx.unidadeEstoque.update({
            where: { id: vaga[0].id },
            data: {
              codigoCifrado: Uint8Array.from(codigoCifrado),
              codigoHash,
              status: StatusUnidade.disponivel,
            },
          });
          return 'ok' as const;
        });

        if (resultado === 'sem_vaga') {
          ignoradosSemVaga++;
        } else {
          importados++;
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          duplicados++;
          continue;
        }
        throw error;
      }
    }

    if (ignoradosSemVaga > 0) {
      this.logger.warn(
        `Produto ${produtoId}: ${ignoradosSemVaga} código(s) importado(s) sem unidade "aguardando_codigo" disponível para receber. Gere um novo lote.`,
      );
    }

    return { importados, duplicados, ignoradosSemVaga };
  }

  /** Reserva 1 unidade disponível dentro da transação do chamador (usado pelo checkout). */
  async reservarUnidadeDisponivel(
    tx: Tx,
    produtoId: string,
  ): Promise<string | null> {
    const linhas = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id FROM unidades_estoque
      WHERE produto_id = ${produtoId}::uuid AND status = 'disponivel'
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);
    if (linhas.length === 0) {
      return null;
    }
    await tx.unidadeEstoque.update({
      where: { id: linhas[0].id },
      data: { status: StatusUnidade.reservado },
    });
    return linhas[0].id;
  }

  /** Confirma a venda da unidade dentro da transação do webhook de pagamento. */
  async confirmarVenda(tx: Tx, unidadeId: string) {
    await tx.unidadeEstoque.update({
      where: { id: unidadeId },
      data: { status: StatusUnidade.vendido },
    });
  }

  /**
   * Libera uma reserva expirada — só reverte se ainda estiver `reservado`
   * (evita sobrescrever uma unidade que foi confirmada como vendida entre o
   * agendamento do job e sua execução).
   */
  async liberarReservaSeExpirada(unidadeId: string): Promise<boolean> {
    const resultado = await this.prisma.unidadeEstoque.updateMany({
      where: { id: unidadeId, status: StatusUnidade.reservado },
      data: { status: StatusUnidade.disponivel },
    });
    return resultado.count > 0;
  }

  /** Decifra o código de uma unidade vendida — sempre chamado junto de um registro de auditoria pelo caller. */
  async obterCodigoDecifrado(unidadeId: string): Promise<string | null> {
    const unidade = await this.prisma.unidadeEstoque.findUnique({
      where: { id: unidadeId },
    });
    if (!unidade?.codigoCifrado) {
      return null;
    }
    return this.encryption.decrypt(Buffer.from(unidade.codigoCifrado));
  }

  /**
   * Reabastece o produto se a contagem de unidades `disponivel` estiver abaixo
   * do limiar. Protegido por advisory lock para tolerar disparo concorrente
   * (job periódico + gatilho de venda) sem gerar lote em duplicidade.
   */
  async reabastecerSeNecessario(produtoId: string): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${produtoId}::text)::bigint)`;

      const produto = await tx.produto.findUniqueOrThrow({
        where: { id: produtoId },
      });
      if (produto.tipoEstoque !== 'serializado') {
        return 0;
      }

      const disponiveis = await this.contarDisponiveis(produtoId, tx);
      if (disponiveis >= produto.limiarReabastecimento) {
        return 0;
      }

      await this.gerarLote(produtoId, produto.estoqueLotePadrao, tx);
      await tx.logReabastecimento.create({
        data: {
          produtoId,
          quantidadeGerada: produto.estoqueLotePadrao,
          motivo: 'automatico_limiar',
        },
      });

      this.logger.log(
        `Reabastecimento automático: produto ${produtoId} gerou ${produto.estoqueLotePadrao} novas unidades (disponíveis antes: ${disponiveis}, limiar: ${produto.limiarReabastecimento})`,
      );
      return produto.estoqueLotePadrao;
    });
  }
}
