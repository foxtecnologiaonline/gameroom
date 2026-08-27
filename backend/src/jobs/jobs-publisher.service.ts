import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Client } from '@upstash/qstash';
import {
  QSTASH_CLIENT,
  ROTA_EMITIR_E_ENTREGAR,
  ROTA_EMITIR_NOTA_FISCAL,
  ROTA_FALHAS,
  ROTA_GERAR_ESTOQUE_INICIAL,
  ROTA_LIBERAR_RESERVA_EXPIRADA,
  ROTA_PROCESSAR_DEVOLUCAO,
  ROTA_REABASTECER_ESTOQUE,
} from './jobs.constants';

/**
 * attempts:5/backoff exponencial de hoje (emissão, devolução/estorno, nota
 * fiscal — falha aqui é "pedido pago sem entrega/reembolso", o pior estado
 * do sistema). attempts:3 para os demais, mesma política de antes.
 */
const RETRIES_CRITICO = 5;
const RETRIES_PADRAO = 3;

interface OpcoesPublicacao {
  deduplicationId?: string;
  delaySegundos?: number;
  retries: number;
}

/**
 * Substitui os antigos `@InjectQueue(...)` + `queue.add(...)` do BullMQ.
 * Cada job vira uma publicação HTTP no QStash, que chama de volta a rota
 * correspondente em `jobs/http/*.controller.ts`. `deduplicationId` cumpre o
 * mesmo papel do antigo `jobId` determinístico (otimização — a garantia de
 * idempotência real está sempre no banco, checada em cada controller).
 */
@Injectable()
export class JobsPublisherService {
  private readonly baseUrl: string;

  constructor(
    @Inject(QSTASH_CLIENT) private readonly qstash: Client,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('APP_BASE_URL')!.replace(/\/+$/, '');
  }

  async agendarLiberarReservaExpirada(
    itemPedidoId: string,
    delayMs: number,
  ): Promise<void> {
    await this.publicar(
      ROTA_LIBERAR_RESERVA_EXPIRADA,
      { itemPedidoId },
      {
        deduplicationId: `liberar-reserva-expirada-${itemPedidoId}`,
        delaySegundos: Math.max(1, Math.round(delayMs / 1000)),
        retries: RETRIES_PADRAO,
      },
    );
  }

  async enfileirarGerarEstoqueInicial(
    produtoId: string,
    quantidade: number,
  ): Promise<void> {
    await this.publicar(
      ROTA_GERAR_ESTOQUE_INICIAL,
      { produtoId, quantidade },
      {
        deduplicationId: `gerar-estoque-inicial-${produtoId}`,
        retries: RETRIES_PADRAO,
      },
    );
  }

  async enfileirarReabastecimento(produtoId: string): Promise<void> {
    await this.publicar(
      ROTA_REABASTECER_ESTOQUE,
      { produtoId },
      { retries: RETRIES_PADRAO },
    );
  }

  async enfileirarEmissao(itemPedidoId: string): Promise<void> {
    await this.publicar(
      ROTA_EMITIR_E_ENTREGAR,
      { itemPedidoId },
      {
        deduplicationId: `emitir-e-entregar-${itemPedidoId}`,
        retries: RETRIES_CRITICO,
      },
    );
  }

  async enfileirarProcessarDevolucao(devolucaoId: string): Promise<void> {
    await this.publicar(
      ROTA_PROCESSAR_DEVOLUCAO,
      { devolucaoId },
      { retries: RETRIES_CRITICO },
    );
  }

  async enfileirarNotaFiscal(pedidoId: string): Promise<void> {
    await this.publicar(
      ROTA_EMITIR_NOTA_FISCAL,
      { pedidoId },
      {
        deduplicationId: `emitir-nota-fiscal-${pedidoId}`,
        retries: RETRIES_CRITICO,
      },
    );
  }

  private async publicar(
    rota: string,
    body: Record<string, unknown>,
    opcoes: OpcoesPublicacao,
  ): Promise<void> {
    await this.qstash.publishJSON({
      url: `${this.baseUrl}/${rota}`,
      body,
      delay: opcoes.delaySegundos,
      deduplicationId: opcoes.deduplicationId,
      retries: opcoes.retries,
      failureCallback: `${this.baseUrl}/${ROTA_FALHAS}?origem=${encodeURIComponent(rota)}`,
    });
  }
}
