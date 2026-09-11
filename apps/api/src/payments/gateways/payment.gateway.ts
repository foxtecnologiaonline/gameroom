import { PaymentMethod } from '../payment-method.enum';
import { PaymentStatus } from '../payment-status.enum';

export interface ChargeSplit {
  sellerId: string;
  recipientId: string | null;
  amountCents: number;
}

export interface ChargeRequest {
  orderId: string;
  method: PaymentMethod;
  totalCents: number;
  splits: ChargeSplit[];
}

export interface ChargeResult {
  gatewayId: string;
  status: PaymentStatus;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

/**
 * Port for the payment gateway (Pagar.me). Split-by-recipient_id happens
 * on the gateway's side at charge time — `splits` here is what we send it
 * and what split_transactions later mirrors for reconciliation.
 */
export interface PaymentGateway {
  charge(request: ChargeRequest): Promise<ChargeResult>;
}
