"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, endpoints } from "@/lib/api";
import type { Devolucao, Produto, Venda } from "@/lib/types";
import { mensagemErro } from "@/lib/format";

interface Kpis {
  produtosAtivos: number;
  vendasConfirmadas: number;
  filaRevisaoManual: number;
}

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Produto[]>(endpoints.produtosAdmin),
      api.get<Venda[]>(endpoints.adminVendas),
      api.get<Devolucao[]>(endpoints.adminDevolucoesRevisaoManual),
    ])
      .then(([produtos, vendas, devolucoes]) => {
        setKpis({
          produtosAtivos: produtos.filter((p) => p.status === "ativo").length,
          vendasConfirmadas: vendas.filter((v) => v.status === "confirmada").length,
          filaRevisaoManual: devolucoes.length,
        });
      })
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && kpis === null && <p className="text-slate-500">Carregando indicadores...</p>}

      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link href="/admin/produtos" className="card p-6 hover:shadow-md">
            <p className="text-sm text-slate-500">Produtos ativos</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{kpis.produtosAtivos}</p>
          </Link>
          <Link href="/admin/vendas" className="card p-6 hover:shadow-md">
            <p className="text-sm text-slate-500">Vendas confirmadas</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{kpis.vendasConfirmadas}</p>
          </Link>
          <Link href="/admin/devolucoes" className="card p-6 hover:shadow-md">
            <p className="text-sm text-slate-500">Devoluções em revisão manual</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{kpis.filaRevisaoManual}</p>
          </Link>
        </div>
      )}
    </div>
  );
}
