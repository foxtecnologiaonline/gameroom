import {
  Body,
  Controller,
  HttpCode,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import {
  ROTA_EMITIR_E_ENTREGAR,
  ROTA_PROCESSAR_DEVOLUCAO,
} from '../jobs.constants';

/**
 * Rotas cuja falha esgotada é "o pior estado possível do sistema" (pedido
 * pago sem entrega/reembolso) — mesmo critério que já existia nos
 * `@OnWorkerEvent('failed')` do BullMQ.
 */
const ROTAS_CRITICAS = new Set([
  ROTA_EMITIR_E_ENTREGAR,
  ROTA_PROCESSAR_DEVOLUCAO,
]);

/**
 * Recebe o `failureCallback` do QStash quando um job esgota as tentativas
 * (substitui `@OnWorkerEvent('failed')` dos processors antigos). O QStash
 * assina esse POST como qualquer outro — mesma guarda de assinatura.
 *
 * O formato exato do payload (campos como `sourceMessageId`/`dlqId`/
 * `status`/`retried`) segue a documentação do QStash em
 * https://upstash.com/docs/qstash/features/callbacks#what-is-a-failure-callback
 * — não verificado ao vivo nesta sessão (sem acesso de rede a artefatos da
 * Upstash); por isso o corpo inteiro é sempre logado, e os campos abaixo são
 * extraídos de forma defensiva (nunca lança se um campo não existir).
 */
@Controller('jobs/_falhas')
@UseGuards(QstashSignatureGuard)
export class FalhasJobsController {
  private readonly logger = new Logger(FalhasJobsController.name);

  @Post()
  @HttpCode(200)
  receberFalha(
    @Query('origem') origem: string | undefined,
    @Body() payload: Record<string, unknown>,
  ): void {
    const critico = origem ? ROTAS_CRITICAS.has(origem) : false;
    const prefixo = critico ? 'ALERTA CRÍTICO' : 'ALERTA';
    const dlqId = payload?.dlqId ?? payload?.messageId ?? 'desconhecido';

    this.logger.error(
      `${prefixo}: job "${origem ?? 'desconhecida'}" esgotou as tentativas ` +
        `(dlqId/messageId: ${dlqId}). Payload completo: ${JSON.stringify(payload)}`,
    );
  }
}
