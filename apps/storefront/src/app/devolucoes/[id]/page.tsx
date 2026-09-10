"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RequireAuth } from "@/components/guards/RequireAuth";
import { api, endpoints } from "@/lib/api";
import type { Devolucao, StatusDevolucao } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

const EXPLICACOES: Record<StatusDevolucao, string> = {
  pendente: "Sua solicitação foi recebida e está aguardando análise. Você será notificado assim que houver uma decisão.",
  aprovada_automatica:
    "Sua devolução foi aprovada automaticamente, dentro dos critérios da política de devolução. O reembolso será processado em breve.",
  aprovada_manual:
    "Sua devolução foi analisada e aprovada manualmente pela nossa equipe. O reembolso será processado em breve.",
  rejeitada:
    "Sua solicitação de devolução foi analisada e não pôde ser aprovada. Entre em contato com o suporte caso tenha dúvidas.",
};

function DevolucaoDetalheContent() {
  const params = useParams<{ id: string }>();
  const [devolucao, setDevolucao] = useState<Devolucao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Devolucao>(endpoints.devolucaoDetalhe(params.id))
      .then(setDevolucao)
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.id]);

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!devolucao) {
    return <p className="text-slate-500">Carregando devolução...</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/minhas-compras" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        &larr; Voltar para minhas compras
      </Link>
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Devolução #{devolucao.id}</h1>
          <StatusBadge status={devolucao.status} />
        </div>

        <p className="mb-4 text-sm text-slate-600">{EXPLICACOES[devolucao.status]}</p>

        <dl className="space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Motivo informado</dt>
            <dd className="max-w-xs text-right font-medium">{devolucao.motivo}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Data da solicitação</dt>
            <dd className="font-medium">{formatarData(devolucao.data || devolucao.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function DevolucaoDetalhePage() {
  return (
    <RequireAuth>
      <DevolucaoDetalheContent />
    </RequireAuth>
  );
}
