export interface SolicitacaoNotaFiscal {
  pedidoId: string;
  valor: number;
  compradorEmail: string;
}

export interface ResultadoNotaFiscal {
  notaFiscalId: string;
}

export const NOTA_FISCAL_PROVIDER = 'NOTA_FISCAL_PROVIDER';

export interface NotaFiscalProvider {
  emitir(solicitacao: SolicitacaoNotaFiscal): Promise<ResultadoNotaFiscal>;
}
