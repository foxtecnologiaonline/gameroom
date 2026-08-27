import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Receiver } from '@upstash/qstash';
import { Request } from 'express';
import { QSTASH_RECEIVER } from './jobs.constants';

/**
 * Equivalente ao `verificarAssinaturaWebhook` de `pagamento/` — mesmo
 * princípio (nunca processar um job sem assinatura válida), mas a
 * verificação em si é do próprio SDK do QStash (`Receiver.verify`).
 * Depende de `rawBody: true` no bootstrap (`main.ts`), já habilitado
 * globalmente para o webhook de pagamento.
 */
@Injectable()
export class QstashSignatureGuard implements CanActivate {
  constructor(@Inject(QSTASH_RECEIVER) private readonly receiver: Receiver) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { rawBody?: Buffer }>();

    const assinatura = request.headers['upstash-signature'];
    if (
      !assinatura ||
      Array.isArray(assinatura) ||
      !request.rawBody ||
      request.rawBody.length === 0
    ) {
      throw new UnauthorizedException('Assinatura do QStash ausente');
    }

    const valida = await this.receiver
      .verify({
        signature: assinatura,
        body: request.rawBody.toString('utf8'),
      })
      .catch(() => false);

    if (!valida) {
      throw new UnauthorizedException('Assinatura do QStash inválida');
    }
    return true;
  }
}
