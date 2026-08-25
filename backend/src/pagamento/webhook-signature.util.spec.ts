import * as crypto from 'crypto';
import { verificarAssinaturaWebhook } from './webhook-signature.util';

describe('verificarAssinaturaWebhook', () => {
  const segredo = 'segredo-de-teste';
  const corpo = Buffer.from(
    JSON.stringify({ pedidoId: 'abc', status: 'aprovado' }),
  );

  function assinar(body: Buffer, s: string) {
    return crypto.createHmac('sha256', s).update(body).digest('hex');
  }

  it('aceita assinatura válida', () => {
    expect(
      verificarAssinaturaWebhook(corpo, assinar(corpo, segredo), segredo),
    ).toBe(true);
  });

  it('rejeita assinatura calculada com segredo errado', () => {
    expect(
      verificarAssinaturaWebhook(
        corpo,
        assinar(corpo, 'segredo-errado'),
        segredo,
      ),
    ).toBe(false);
  });

  it('rejeita quando o corpo foi alterado após a assinatura', () => {
    const assinatura = assinar(corpo, segredo);
    const corpoAlterado = Buffer.from(
      JSON.stringify({ pedidoId: 'abc', status: 'recusado' }),
    );
    expect(verificarAssinaturaWebhook(corpoAlterado, assinatura, segredo)).toBe(
      false,
    );
  });

  it('rejeita assinatura ausente', () => {
    expect(verificarAssinaturaWebhook(corpo, '', segredo)).toBe(false);
  });
});
