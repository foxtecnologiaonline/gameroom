const COLORS: Record<string, string> = {
  // SubOrderStatus
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",

  // PaymentStatus
  failed: "bg-red-100 text-red-800",

  // SellerStatus
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  suspended: "bg-slate-100 text-slate-600",
};

const LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  shipped: "Enviado",
  delivered: "Entregue",
  failed: "Falhou",

  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] || "bg-slate-100 text-slate-600";
  const label = LABELS[status] || status;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  );
}
