"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Venda } from "@/lib/types";
import { formatarData, formatarPreco, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";

export default function MinhasComprasPage() {
  const [compras, setCompras] = useState<Venda[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Venda[]>(endpoints.minhasCompras)
      .then(setCompras)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Minhas compras</h1>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      {!erro && compras === null && <p className="text-slate-500">Carregando compras...</p>}
      {compras !== null && compras.length === 0 && (
        <p className="text-slate-500">Você ainda não realizou nenhuma compra.</p>
      )}

      <div className="space-y-3">
        {compras?.map((venda) => {
          const nomeProduto =
            (venda.produto && "nome" in venda.produto ? venda.produto.nome : undefined) || "Produto";
          return (
            <Link key={venda.id} href={`/minhas-compras/${venda.id}`} className="card block p-4 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{nomeProduto}</p>
                  <p className="text-sm text-slate-500">
                    {formatarData(venda.data || venda.createdAt)}
                    {(venda.codigo || venda.chave) && ` · Código: ${venda.codigo || venda.chave}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-700">{formatarPreco(venda.valor)}</span>
                  <StatusBadge status={venda.status} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
