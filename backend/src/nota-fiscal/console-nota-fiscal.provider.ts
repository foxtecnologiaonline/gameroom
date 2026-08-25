import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  NotaFiscalProvider,
  ResultadoNotaFiscal,
  SolicitacaoNotaFiscal,
} from './nota-fiscal-provider.interface';

/**
 * Provider de desenvolvimento — apenas loga a nota fiscal que seria emitida.
 * Em produção, trocar pela integração real (ex.: NFE.io ou similar)
 * implementando NotaFiscalProvider.
 */
@Injectable()
export class ConsoleNotaFiscalProvider implements NotaFiscalProvider {
  private readonly logger = new Logger('NotaFiscalProvider(console)');

  async emitir(
    solicitacao: SolicitacaoNotaFiscal,
  ): Promise<ResultadoNotaFiscal> {
    const notaFiscalId = `nfe_dev_${randomUUID()}`;
    this.logger.log(
      `Emitindo nota fiscal de R$ ${solicitacao.valor.toFixed(2)} para ${solicitacao.compradorEmail} referente ao pedido ${solicitacao.pedidoId} (${notaFiscalId})`,
    );
    return { notaFiscalId };
  }
}
