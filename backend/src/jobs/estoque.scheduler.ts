import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  QUEUE_ESTOQUE,
  JOB_VERIFICAR_REABASTECIMENTO,
} from './queues.constants';

const INTERVALO_VARREDURA_MS = 5 * 60 * 1000;

/**
 * Gatilho de segurança do reabastecimento (item 3 das regras de negócio v2):
 * o disparo principal acontece a cada venda confirmada (PagamentoService),
 * esta varredura periódica apenas cobre o caso de um produto ficar abaixo do
 * limiar sem uma venda recente (ex.: limiar alterado manualmente pelo admin).
 */
@Injectable()
export class EstoqueScheduler implements OnModuleInit {
  private readonly logger = new Logger(EstoqueScheduler.name);

  constructor(
    @InjectQueue(QUEUE_ESTOQUE) private readonly estoqueQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.estoqueQueue.upsertJobScheduler(
      'verificar-reabastecimento-cron',
      { every: INTERVALO_VARREDURA_MS },
      {
        name: JOB_VERIFICAR_REABASTECIMENTO,
        data: {},
      },
    );
    this.logger.log(
      `Varredura periódica de reabastecimento agendada a cada ${INTERVALO_VARREDURA_MS / 1000}s`,
    );
  }
}
