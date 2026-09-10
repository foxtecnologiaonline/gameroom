"use client";

import { useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Reabastecimento } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { DataTable, type Column } from "@/components/DataTable";

export default function AdminReabastecimentosPage() {
  const [itens, setItens] = useState<Reabastecimento[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Reabastecimento[]>(endpoints.adminReabastecimentos)
      .then(setItens)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  const columns: Column<Reabastecimento>[] = [
    { key: "produto", header: "Produto", accessor: (r) => r.produto?.nome || r.produtoId },
    { key: "quantidade", header: "Quantidade gerada", accessor: (r) => r.quantidadeGerada },
    { key: "estoqueAntes", header: "Estoque antes", accessor: (r) => r.estoqueAntes },
    { key: "data", header: "Data", accessor: (r) => formatarData(r.data || r.createdAt) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reabastecimentos</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && itens === null && <p className="text-slate-500">Carregando log de reabastecimentos...</p>}

      {itens !== null && (
        <div className="card p-4">
          <DataTable columns={columns} rows={itens} rowKey={(r) => r.id} emptyMessage="Nenhum reabastecimento registrado." />
        </div>
      )}
    </div>
  );
}
