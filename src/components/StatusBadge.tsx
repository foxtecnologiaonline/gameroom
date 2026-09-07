const COLORS: Record<string, string> = {
  ativo: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  inativo: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10",
  rascunho: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20",

  pendente: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20",
  aguardando_pagamento: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20",
  confirmada: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  cancelada: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10",
  reembolsada: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10",

  aprovada_automatica: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  aprovada_manual: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  rejeitada: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10",

  disponivel: "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20",
  reservado: "bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20",
  vendido: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20",
  devolvido: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20",
  bloqueado: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/10",
};

const DOT_COLORS: Record<string, string> = {
  ativo: "bg-green-500",
  inativo: "bg-slate-400",
  rascunho: "bg-yellow-500",

  pendente: "bg-yellow-500",
  aguardando_pagamento: "bg-yellow-500",
  confirmada: "bg-green-500",
  cancelada: "bg-red-500",
  reembolsada: "bg-slate-400",

  aprovada_automatica: "bg-green-500",
  aprovada_manual: "bg-green-500",
  rejeitada: "bg-red-500",

  disponivel: "bg-green-500",
  reservado: "bg-yellow-500",
  vendido: "bg-blue-500",
  devolvido: "bg-orange-500",
  bloqueado: "bg-red-500",
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
  const color = COLORS[status] || "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10";
  const dot = DOT_COLORS[status] || "bg-slate-400";
  const label = LABELS[status] || status;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
