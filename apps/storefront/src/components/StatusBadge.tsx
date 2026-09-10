const COLORS: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-slate-100 text-slate-600",
  rascunho: "bg-yellow-100 text-yellow-800",

  pendente: "bg-yellow-100 text-yellow-800",
  aguardando_pagamento: "bg-yellow-100 text-yellow-800",
  confirmada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
  reembolsada: "bg-slate-100 text-slate-600",

  aprovada_automatica: "bg-green-100 text-green-800",
  aprovada_manual: "bg-green-100 text-green-800",
  rejeitada: "bg-red-100 text-red-800",

  disponivel: "bg-green-100 text-green-800",
  reservado: "bg-yellow-100 text-yellow-800",
  vendido: "bg-blue-100 text-blue-800",
  devolvido: "bg-orange-100 text-orange-800",
  bloqueado: "bg-red-100 text-red-800",
};

const LABELS: Record<string, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  rascunho: "Rascunho",

  pendente: "Pendente",
  aguardando_pagamento: "Aguardando pagamento",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  reembolsada: "Reembolsada",

  aprovada_automatica: "Aprovada automaticamente",
  aprovada_manual: "Aprovada manualmente",
  rejeitada: "Rejeitada",

  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  devolvido: "Devolvido",
  bloqueado: "Bloqueado",
};

export function StatusBadge({ status }: { status: string }) {
  const color = COLORS[status] || "bg-slate-100 text-slate-600";
  const label = LABELS[status] || status;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{label}</span>
  );
}
