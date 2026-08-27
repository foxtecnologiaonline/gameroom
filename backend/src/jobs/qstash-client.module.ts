import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Client, Receiver } from '@upstash/qstash';
import { QSTASH_CLIENT, QSTASH_RECEIVER } from './jobs.constants';

/**
 * Substitui o antigo `BullModule.forRootAsync` (Redis). QSTASH_URL é usado
 * só em desenvolvimento local, para apontar para o `qstash-cli dev` em vez
 * do QStash real — em produção fica vazio e o SDK usa o endpoint padrão.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: QSTASH_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Client({
          token: config.get<string>('QSTASH_TOKEN')!,
          baseUrl: config.get<string>('QSTASH_URL') || undefined,
        }),
    },
    {
      provide: QSTASH_RECEIVER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Receiver({
          currentSigningKey: config.get<string>('QSTASH_CURRENT_SIGNING_KEY')!,
          nextSigningKey: config.get<string>('QSTASH_NEXT_SIGNING_KEY')!,
        }),
    },
  ],
  exports: [QSTASH_CLIENT, QSTASH_RECEIVER],
})
export class QstashClientModule {}
