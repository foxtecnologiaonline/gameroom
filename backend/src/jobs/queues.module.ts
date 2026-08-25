import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  QUEUE_DEVOLUCOES,
  QUEUE_EMISSAO,
  QUEUE_ESTOQUE,
  QUEUE_RESERVAS,
} from './queues.constants';

/**
 * Módulo "leve" que só registra as filas para injeção (produtores).
 * Os processors (consumidores) ficam no JobsModule, que depende dos módulos
 * de domínio — separar evita dependência circular entre eles.
 */
@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: QUEUE_ESTOQUE,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_RESERVAS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_EMISSAO,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_DEVOLUCOES,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 10000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
    ),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
