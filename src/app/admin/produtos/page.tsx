"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { DataTable, type Column } from "@/components/DataTable";

export default function AdminProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Produto[]>(endpoints.produtosAdmin)
      .then(setProdutos)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  const columns: Column<Produto>[] = [
    { key: "nome", header: "Nome", accessor: (p) => p.nome },
    { key: "categoria", header: "Categoria", accessor: (p) => p.categoria },
    { key: "preco", header: "Preço", accessor: (p) => formatarPreco(p.preco) },
    { key: "status", header: "Status", accessor: (p) => <StatusBadge status={p.status} /> },
    {
      key: "acoes",
      header: "Ações",
      accessor: (p) => (
        <Link href={`/admin/produtos/${p.id}`} className="text-brand-600 hover:underline">
          Editar
        </Link>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <Link href="/admin/produtos/novo" className="btn-primary">
          Novo produto
        </Link>
      </div>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && produtos === null && <p className="text-slate-500">Carregando produtos...</p>}

      {produtos !== null && (
        <div className="card p-4">
          <DataTable columns={columns} rows={produtos} rowKey={(p) => p.id} emptyMessage="Nenhum produto cadastrado." />
        </div>
      )}
    </div>
  );
}
