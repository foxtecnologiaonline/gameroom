"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { ResumoEstoque, StatusUnidadeEstoque, UnidadeEstoque } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/DataTable";

interface EstoqueResponse {
  resumo?: ResumoEstoque;
  unidades?: UnidadeEstoque[];
}

const STATUS_ORDEM: StatusUnidadeEstoque[] = ["disponivel", "reservado", "vendido", "devolvido", "bloqueado"];

function calcularResumo(unidades: UnidadeEstoque[]): ResumoEstoque {
  const resumo: ResumoEstoque = { disponivel: 0, reservado: 0, vendido: 0, devolvido: 0, bloqueado: 0 };
  for (const u of unidades) {
    if (u.status in resumo) resumo[u.status] += 1;
  }
  return resumo;
}

export default function AdminEstoquePage() {
  const params = useParams<{ produtoId: string }>();
  const [dados, setDados] = useState<EstoqueResponse | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<EstoqueResponse | UnidadeEstoque[]>(endpoints.adminEstoque(params.produtoId))
      .then((res) => {
        if (Array.isArray(res)) {
          setDados({ unidades: res, resumo: calcularResumo(res) });
        } else {
          setDados({ unidades: res.unidades || [], resumo: res.resumo || calcularResumo(res.unidades || []) });
        }
      })
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.produtoId]);

  const columns: Column<UnidadeEstoque>[] = [
    { key: "id", header: "ID", accessor: (u) => u.id },
    { key: "codigo", header: "Código", accessor: (u) => u.codigo || "-" },
    { key: "status", header: "Status", accessor: (u) => <StatusBadge status={u.status} /> },
    { key: "data", header: "Criado em", accessor: (u) => formatarData(u.createdAt) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Estoque do produto</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && dados === null && <p className="text-slate-500">Carregando estoque...</p>}

      {dados?.resumo && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {STATUS_ORDEM.map((status) => (
            <div key={status} className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{dados.resumo?.[status] ?? 0}</p>
              <p className="mt-1">
                <StatusBadge status={status} />
              </p>
            </div>
          ))}
        </div>
      )}

      {dados && (
        <div className="card p-4">
          <DataTable
            columns={columns}
            rows={dados.unidades || []}
            rowKey={(u) => u.id}
            emptyMessage="Nenhuma unidade de estoque encontrada."
          />
        </div>
      )}
    </div>
  );
}
