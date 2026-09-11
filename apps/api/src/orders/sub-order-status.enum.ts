/**
 * Sequence given verbatim by CLAUDE.md: pending -> paid -> shipped ->
 * delivered. Transition endpoints (PATCH /suborders/:id/status) and the
 * domain event per transition are backlog item 10, not built here.
 */
export enum SubOrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
}
