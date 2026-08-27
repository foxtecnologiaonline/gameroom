export const QSTASH_CLIENT = 'QSTASH_CLIENT';
export const QSTASH_RECEIVER = 'QSTASH_RECEIVER';

/**
 * Rotas HTTP que o QStash chama para executar cada job (substituem os nomes
 * de fila/job do BullMQ). Cada uma corresponde exatamente a
 * `@Controller(...)` + `@Post(...)` de um dos controllers em `jobs/http/`.
 */
export const ROTA_GERAR_ESTOQUE_INICIAL = 'jobs/estoque/gerar-estoque-inicial';
export const ROTA_REABASTECER_ESTOQUE = 'jobs/estoque/reabastecer-estoque';
export const ROTA_VERIFICAR_REABASTECIMENTO =
  'jobs/estoque/verificar-reabastecimento';
export const ROTA_LIBERAR_RESERVA_EXPIRADA =
  'jobs/reservas/liberar-reserva-expirada';
export const ROTA_EMITIR_E_ENTREGAR = 'jobs/emissao/emitir-e-entregar';
export const ROTA_PROCESSAR_DEVOLUCAO = 'jobs/devolucoes/processar-devolucao';
export const ROTA_EMITIR_NOTA_FISCAL = 'jobs/nota-fiscal/emitir-nota-fiscal';
/** Recebe o `failureCallback` do QStash quando um job esgota as tentativas. */
export const ROTA_FALHAS = 'jobs/_falhas';

export interface GerarEstoqueInicialJobData {
  produtoId: string;
  quantidade: number;
}

export interface ReabastecerEstoqueJobData {
  produtoId: string;
}

export interface LiberarReservaExpiradaJobData {
  itemPedidoId: string;
}

export interface EmitirEEntregarJobData {
  itemPedidoId: string;
}

export interface ProcessarDevolucaoJobData {
  devolucaoId: string;
}

export interface EmitirNotaFiscalJobData {
  pedidoId: string;
}
