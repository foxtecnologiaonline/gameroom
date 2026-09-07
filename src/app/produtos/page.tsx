"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { ProductCover } from "@/components/ProductCover";

type Ordenacao = "relevancia" | "menor-preco" | "maior-preco" | "recentes";

const OPCOES_ORDENACAO: { value: Ordenacao; label: string }[] = [
  { value: "relevancia", label: "Relevância" },
  { value: "menor-preco", label: "Menor preço" },
  { value: "maior-preco", label: "Maior preço" },
  { value: "recentes", label: "Mais recentes" },
];

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton aspect-[16/10]" />
      <div className="space-y-2 p-4">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-5 w-1/2" />
      </div>
    </div>
  );
}

function ProdutosContent() {
  const searchParams = useSearchParams();
  const [produtos, setProdutos] = useState<Produto[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState(searchParams.get("busca") || "");
  const [categoria, setCategoria] = useState<string>(searchParams.get("categoria") || "todas");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("relevancia");

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
    const filtrados = produtos.filter((p) => {
      const bateCategoria = categoria === "todas" || p.categoria === categoria;
      const bateBusca = !termo || p.nome.toLowerCase().includes(termo) || p.categoria.toLowerCase().includes(termo);
      return bateCategoria && bateBusca;
    });

    const ordenados = [...filtrados];
    if (ordenacao === "menor-preco") ordenados.sort((a, b) => a.preco - b.preco);
    else if (ordenacao === "maior-preco") ordenados.sort((a, b) => b.preco - a.preco);
    else if (ordenacao === "recentes") {
      ordenados.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }
    return ordenados;
  }, [produtos, busca, categoria, ordenacao]);

  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">Ativos digitais para acelerar o seu jogo</h1>
        <p className="mt-3 max-w-lg text-brand-100">
          Chaves, gift cards, cursos e pacotes de assets com entrega automática assim que o pagamento é confirmado.
        </p>
      </section>

      <div className="mb-5">
        <input
          className="input sm:max-w-md"
          placeholder="Buscar produto ou categoria..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          <button
            onClick={() => setCategoria("todas")}
            className={`chip ${categoria === "todas" ? "chip-active" : ""}`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button key={c} onClick={() => setCategoria(c)} className={`chip ${categoria === c ? "chip-active" : ""}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="flex flex-none items-center gap-2 text-sm">
          <label htmlFor="ordenacao" className="flex-none text-slate-500">
            Ordenar por
          </label>
          <select
            id="ordenacao"
            className="input w-auto"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
          >
            {OPCOES_ORDENACAO.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {produtos && `${produtosFiltrados.length} produto${produtosFiltrados.length === 1 ? "" : "s"} encontrado${produtosFiltrados.length === 1 ? "" : "s"}`}
      </p>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      {!erro && produtos === null && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {produtos !== null && produtosFiltrados.length === 0 && !erro && (
        <div className="card p-12 text-center">
          <p className="mb-1 text-3xl">🔍</p>
          <p className="text-slate-600">
            {produtos.length === 0
              ? "Nenhum produto disponível no momento."
              : "Nenhum produto encontrado para essa busca."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {produtosFiltrados.map((produto) => (
          <Link
            key={produto.id}
            href={`/produtos/${produto.id}`}
            className="card card-hover group block overflow-hidden"
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

export default function ProdutosPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Carregando...</div>}>
      <ProdutosContent />
    </Suspense>
  );
}
