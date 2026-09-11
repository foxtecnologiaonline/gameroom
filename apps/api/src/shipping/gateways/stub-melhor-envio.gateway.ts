import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  LabelRequest,
  LabelResult,
  QuoteRequest,
  ShippingGateway,
  ShippingOption,
} from './shipping.gateway';

const BASE_PRICE_CENTS = 800;
const PRICE_PER_GRAM_CENTS = 0.02;

/**
 * Placeholder, same status as the other gateways (StubRecipientGateway,
 * StubPaymentGateway): the real Melhor Envio API needs credentials this
 * environment doesn't have. Prices are a deterministic function of weight
 * so quote()/createLabel() are exercised and testable end-to-end without
 * a live integration.
 */
@Injectable()
export class StubMelhorEnvioGateway implements ShippingGateway {
  async quote(request: QuoteRequest): Promise<ShippingOption[]> {
    const distance =
      BASE_PRICE_CENTS + request.weightGrams * PRICE_PER_GRAM_CENTS;
    return [
      { carrier: 'correios-pac', priceCents: Math.round(distance), etaDays: 7 },
      {
        carrier: 'correios-sedex',
        priceCents: Math.round(distance * 2),
        etaDays: 3,
      },
    ];
  }

  async createLabel(request: LabelRequest): Promise<LabelResult> {
    const trackingCode = `BR${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
    return {
      trackingCode,
      etaDays: request.carrier === 'correios-sedex' ? 3 : 7,
    };
  }
}
