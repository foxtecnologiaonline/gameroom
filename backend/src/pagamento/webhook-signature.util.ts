import * as crypto from 'crypto';

/**
 * Verificação genérica de assinatura HMAC-SHA256 de webhook.
 *
 * Gateways reais (Stripe, Mercado Pago, PagSeguro) têm formatos próprios de
 * cabeçalho/assinatura — em produção, trocar por `stripe.webhooks.constructEvent`
 * ou equivalente do SDK do gateway escolhido. Esta função cobre o caso genérico
 * de um serviço que assina o corpo bruto com um segredo compartilhado.
 */
export function verificarAssinaturaWebhook(
  rawBody: Buffer,
  assinaturaRecebida: string,
  segredo: string,
): boolean {
  if (!assinaturaRecebida || !segredo) {
    return false;
  }
  const assinaturaEsperada = crypto
    .createHmac('sha256', segredo)
    .update(rawBody)
    .digest('hex');

  const bufferRecebido = Buffer.from(assinaturaRecebida);
  const bufferEsperado = Buffer.from(assinaturaEsperada);
  if (bufferRecebido.length !== bufferEsperado.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufferRecebido, bufferEsperado);
}
