import { SubOrderStatus } from '../sub-order-status.enum';

export const SUB_ORDER_STATUS_CHANGED = 'sub-order.status-changed';

/**
 * Emitted on every SubOrder status transition — non-negotiable per
 * CLAUDE.md ("toda transição de status de SubOrder/Payment emite um
 * evento de domínio — mesmo dentro do monolito"). In-process for now
 * (EventEmitter2); the event shape is what would cross a real broker if
 * this module were ever split out.
 */
export class SubOrderStatusChangedEvent {
  constructor(
    public readonly subOrderId: string,
    public readonly orderId: string,
    public readonly sellerId: string,
    public readonly previousStatus: SubOrderStatus,
    public readonly newStatus: SubOrderStatus,
  ) {}
}
