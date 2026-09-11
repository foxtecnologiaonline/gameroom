/**
 * Sequence given verbatim by CLAUDE.md: pending -> paid -> shipped ->
 * delivered. `payments`/`shipping` drive pending->paid and paid->shipped
 * automatically; PATCH /suborders/:id/status (backlog item 10) covers the
 * remaining manual, seller-driven step to `delivered`.
 */
export enum SubOrderStatus {
  Pending = 'pending',
  Paid = 'paid',
  Shipped = 'shipped',
  Delivered = 'delivered',
}
