"use client";

import { useCallback, useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Devolucao } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { useToast } from "@/lib/toast-context";

export default function AdminDevolucoesPage() {
  const { toast } = useToast();
  const [itens, setItens] = useState<Devolucao[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [processando, setProcessando] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api
      .get<Devolucao[]>(endpoints.adminDevolucoesRevisaoManual)
      .then(setItens)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function aprovar(id: string) {
    setProcessando(id);
    try {
      await api.patch(endpoints.adminDevolucaoAprovar(id));
      toast("Devolução aprovada", "success");
      setItens((cur) => (cur ? cur.filter((d) => d.id !== id) : cur));
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setProcessando(null);
    }
  }

  async function rejeitar(id: string) {
    setProcessando(id);
    try {
      await api.patch(endpoints.adminDevolucaoRejeitar(id));
      toast("Devolução rejeitada", "success");
      setItens((cur) => (cur ? cur.filter((d) => d.id !== id) : cur));
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setProcessando(null);
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Fila de revisão manual — Devoluções</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && itens === null && <p className="text-slate-500">Carregando fila...</p>}
      {itens !== null && itens.length === 0 && (
        <p className="text-slate-500">Nenhuma devolução aguardando revisão manual.</p>
      )}

      <div className="space-y-3">
        {itens?.map((d) => (
          <div key={d.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium text-slate-900">Devolução #{d.id}</p>
              <span className="text-xs text-slate-400">{formatarData(d.data || d.createdAt)}</span>
            </div>
            <p className="mb-1 text-sm text-slate-500">Venda: {d.vendaId}</p>
            <p className="mb-4 text-sm text-slate-700">{d.motivo}</p>
            <div className="flex gap-2">
              <button
                className="btn-primary"
                onClick={() => aprovar(d.id)}
                disabled={processando === d.id}
              >
                {processando === d.id ? "Processando..." : "Aprovar"}
              </button>
              <button
                className="btn-danger"
                onClick={() => rejeitar(d.id)}
                disabled={processando === d.id}
              >
                {processando === d.id ? "Processando..." : "Rejeitar"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
