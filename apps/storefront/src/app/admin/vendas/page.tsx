"use client";

import { useEffect, useMemo, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { StatusVenda, Venda } from "@/lib/types";
import { formatarData, formatarPreco, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/DataTable";

const STATUS_OPCOES: (StatusVenda | "todos")[] = [
  "todos",
  "pendente",
  "aguardando_pagamento",
  "confirmada",
  "cancelada",
  "reembolsada",
];

export default function AdminVendasPage() {
  const [vendas, setVendas] = useState<Venda[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<StatusVenda | "todos">("todos");

  useEffect(() => {
    api
      .get<Venda[]>(endpoints.adminVendas)
      .then(setVendas)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  const vendasFiltradas = useMemo(() => {
    if (!vendas) return [];
    if (filtroStatus === "todos") return vendas;
    return vendas.filter((v) => v.status === filtroStatus);
  }, [vendas, filtroStatus]);

  const columns: Column<Venda>[] = [
    {
      key: "comprador",
      header: "Comprador",
      accessor: (v) => v.comprador?.nome || v.comprador?.email || v.email || "-",
    },
    {
      key: "produto",
      header: "Produto",
      accessor: (v) => (v.produto && "nome" in v.produto ? v.produto.nome : "-"),
    },
    { key: "valor", header: "Valor", accessor: (v) => formatarPreco(v.valor) },
    { key: "status", header: "Status", accessor: (v) => <StatusBadge status={v.status} /> },
    { key: "data", header: "Data", accessor: (v) => formatarData(v.data || v.createdAt) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Vendas</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      {!erro && vendas === null && <p className="text-slate-500">Carregando vendas...</p>}

      {vendas !== null && (
        <>
          <div className="mb-4 flex items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="filtroStatus">
              Filtrar por status
            </label>
            <select
              id="filtroStatus"
              className="input w-auto"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as StatusVenda | "todos")}
            >
              {STATUS_OPCOES.map((s) => (
                <option key={s} value={s}>
                  {s === "todos" ? "Todos" : s}
                </option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <DataTable
              columns={columns}
              rows={vendasFiltradas}
              rowKey={(v) => v.id}
              emptyMessage="Nenhuma venda encontrada."
            />
          </div>
        </>
      )}
    </div>
  );
}
