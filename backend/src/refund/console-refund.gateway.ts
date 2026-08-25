import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  RefundGateway,
  ResultadoEstorno,
  SolicitacaoEstorno,
} from './refund-gateway.interface';

/**
 * Gateway de desenvolvimento — apenas loga o estorno que seria solicitado.
 * Em produção, trocar pela integração real (Stripe Refunds, Mercado Pago
 * reembolsos, etc.) implementando RefundGateway.
 */
@Injectable()
export class ConsoleRefundGateway implements RefundGateway {
  private readonly logger = new Logger('RefundGateway(console)');

  async estornar(solicitacao: SolicitacaoEstorno): Promise<ResultadoEstorno> {
    const estornoId = `estorno_dev_${randomUUID()}`;
    this.logger.log(
      `Solicitando estorno de R$ ${solicitacao.valor.toFixed(2)} referente à transação ${solicitacao.transacaoOriginalId} (${estornoId})`,
    );
    return { estornoId };
  }
}
