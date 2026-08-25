export const QUEUE_ESTOQUE = 'estoque';
export const QUEUE_RESERVAS = 'reservas';
export const QUEUE_EMISSAO = 'emissao';
export const QUEUE_DEVOLUCOES = 'devolucoes';
export const QUEUE_NOTA_FISCAL = 'nota-fiscal';

export const JOB_GERAR_ESTOQUE_INICIAL = 'gerar-estoque-inicial';
export const JOB_REABASTECER_ESTOQUE = 'reabastecer-estoque';
/** Varredura de segurança: roda periodicamente e verifica todos os produtos serializados. */
export const JOB_VERIFICAR_REABASTECIMENTO = 'verificar-reabastecimento';
export const JOB_LIBERAR_RESERVA_EXPIRADA = 'liberar-reserva-expirada';
export const JOB_EMITIR_E_ENTREGAR = 'emitir-e-entregar';
export const JOB_PROCESSAR_DEVOLUCAO = 'processar-devolucao';
export const JOB_EMITIR_NOTA_FISCAL = 'emitir-nota-fiscal';

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
