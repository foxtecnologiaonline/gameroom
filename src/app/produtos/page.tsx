"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { ProductCover } from "@/components/ProductCover";

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string>("todas");

  useEffect(() => {
    api
      .get<Produto[]>(endpoints.produtos, { auth: false })
      .then((data) => setProdutos(Array.isArray(data) ? data.filter((p) => p.status === "ativo" || !p.status) : []))
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  const categorias = useMemo(() => {
    if (!produtos) return [];
    return Array.from(new Set(produtos.map((p) => p.categoria))).sort();
  }, [produtos]);

  const produtosFiltrados = useMemo(() => {
    if (!produtos) return [];
    const termo = busca.trim().toLowerCase();
    return produtos.filter((p) => {
      const bateCategoria = categoria === "todas" || p.categoria === categoria;
      const bateBusca = !termo || p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo);
      return bateCategoria && bateBusca;
    });
  }, [produtos, busca, categoria]);

  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">Ativos digitais para acelerar o seu jogo</h1>
        <p className="mt-3 max-w-lg text-brand-100">
          Chaves, gift cards, cursos e pacotes de assets com entrega automática assim que o pagamento é confirmado.
        </p>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          Produtos
          {produtos && <span className="ml-2 text-sm font-normal text-slate-500">({produtosFiltrados.length})</span>}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input sm:w-64"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select className="input sm:w-48" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="todas">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      {!erro && produtos === null && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {produtos !== null && produtosFiltrados.length === 0 && !erro && (
        <div className="card p-10 text-center text-slate-500">
          {produtos.length === 0
            ? "Nenhum produto disponível no momento."
            : "Nenhum produto encontrado para essa busca."}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {produtosFiltrados.map((produto) => (
          <Link
            key={produto.id}
            href={`/produtos/${produto.id}`}
            className="card group block overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="aspect-[16/10] overflow-hidden">
              <ProductCover
                nome={produto.nome}
                categoria={produto.categoria}
                imagemUrl={produto.imagemUrl}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {produto.categoria}
              </span>
              <h3 className="mb-1 font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
                {produto.nome}
              </h3>
              <p className="text-lg font-bold text-brand-700">{formatarPreco(produto.preco)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
