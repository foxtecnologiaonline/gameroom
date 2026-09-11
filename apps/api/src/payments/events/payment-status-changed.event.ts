import { PaymentStatus } from '../payment-status.enum';

export const PAYMENT_STATUS_CHANGED = 'payment.status-changed';

/**
 * Emitted on every Payment status transition, including its creation
 * (previousStatus: null) — non-negotiable per CLAUDE.md ("toda transição
 * de status de SubOrder/Payment emite um evento de domínio").
 */
export class PaymentStatusChangedEvent {
  constructor(
    public readonly paymentId: string,
    public readonly orderId: string,
    public readonly previousStatus: PaymentStatus | null,
    public readonly newStatus: PaymentStatus,
  ) {}
}
