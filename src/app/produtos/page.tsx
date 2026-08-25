"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Produto[]>(endpoints.produtos, { auth: false })
      .then((data) => setProdutos(Array.isArray(data) ? data.filter((p) => p.status === "ativo" || !p.status) : []))
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Produtos</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      {!erro && produtos === null && <p className="text-slate-500">Carregando produtos...</p>}

      {produtos !== null && produtos.length === 0 && !erro && (
        <p className="text-slate-500">Nenhum produto disponível no momento.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {produtos?.map((produto) => (
          <Link
            key={produto.id}
            href={`/produtos/${produto.id}`}
            className="card block p-4 transition-shadow hover:shadow-md"
          >
            <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
              {produto.categoria}
            </span>
            <h2 className="mb-1 font-semibold text-slate-900">{produto.nome}</h2>
            <p className="text-lg font-bold text-brand-700">{formatarPreco(produto.preco)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
