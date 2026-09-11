import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PaymentMethod } from '../payment-method.enum';
import { PaymentStatus } from '../payment-status.enum';
import { ChargeRequest, ChargeResult, PaymentGateway } from './payment.gateway';

/**
 * Placeholder, same status as StubRecipientGateway (src/seller/gateways):
 * the real Pagar.me `POST /orders` call (card tokenization, split_rules
 * payload, PIX QR code, etc.) needs credentials this environment doesn't
 * have. Mirrors realistic gateway behavior so the rest of the payments
 * flow (persistence, SubOrder transition, webhook) can be built and
 * tested end-to-end against something: credit card settles synchronously
 * ("paid" immediately), PIX only settles once the webhook confirms it.
 */
@Injectable()
export class StubPaymentGateway implements PaymentGateway {
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    return {
      gatewayId: `stub_charge_${randomUUID()}`,
      status:
        request.method === PaymentMethod.CreditCard
          ? PaymentStatus.Paid
          : PaymentStatus.Pending,
    };
  }
}
