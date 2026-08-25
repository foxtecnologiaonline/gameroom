export interface SolicitacaoEstorno {
  /** gateway_transacao_id do pedido original — referência para o gateway localizar a cobrança. */
  transacaoOriginalId: string;
  valor: number;
  motivo?: string;
}

export interface ResultadoEstorno {
  estornoId: string;
}

export const REFUND_GATEWAY = 'REFUND_GATEWAY';

export interface RefundGateway {
  estornar(solicitacao: SolicitacaoEstorno): Promise<ResultadoEstorno>;
}
