import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstoqueService } from '../../estoque/estoque.service';
import {
  QUEUE_ESTOQUE,
  JOB_GERAR_ESTOQUE_INICIAL,
  JOB_REABASTECER_ESTOQUE,
  JOB_VERIFICAR_REABASTECIMENTO,
  GerarEstoqueInicialJobData,
  ReabastecerEstoqueJobData,
} from '../queues.constants';

@Processor(QUEUE_ESTOQUE)
export class EstoqueProcessor extends WorkerHost {
  private readonly logger = new Logger(EstoqueProcessor.name);

  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case JOB_GERAR_ESTOQUE_INICIAL: {
        const { produtoId, quantidade } =
          job.data as GerarEstoqueInicialJobData;
        await this.estoqueService.gerarLote(produtoId, quantidade);
        this.logger.log(
          `Estoque inicial gerado: produto ${produtoId}, ${quantidade} unidades`,
        );
        return;
      }
      case JOB_REABASTECER_ESTOQUE: {
        const { produtoId } = job.data as ReabastecerEstoqueJobData;
        await this.estoqueService.reabastecerSeNecessario(produtoId);
        return;
      }
      case JOB_VERIFICAR_REABASTECIMENTO: {
        const produtos = await this.prisma.produto.findMany({
          where: { tipoEstoque: 'serializado', status: { not: 'inativo' } },
          select: { id: true },
        });
        for (const produto of produtos) {
          await this.estoqueService.reabastecerSeNecessario(produto.id);
        }
        return;
      }
      default:
        this.logger.warn(
          `Job desconhecido na fila ${QUEUE_ESTOQUE}: ${job.name}`,
        );
    }
  }
}
