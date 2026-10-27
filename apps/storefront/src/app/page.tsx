"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Product } from "@/lib/types";
import { mensagemErro } from "@/lib/format";
import { ProductCover } from "@/components/ProductCover";

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const search = query.trim();
    const path = search
      ? `${endpoints.products}?query=${encodeURIComponent(search)}`
      : endpoints.products;

    const timeout = setTimeout(() => {
      api
        .get<Product[]>(path, { auth: false })
        .then((data) => setProducts(data))
        .catch((err) => setErro(mensagemErro(err)));
    }, 250);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div>
      <section className="mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-12 text-white sm:px-10">
        <h1 className="max-w-xl text-3xl font-bold sm:text-4xl">
          Jogos, contas e ativos digitais de vários vendedores
        </h1>
        <p className="mt-3 max-w-lg text-brand-100">
          Um marketplace multi-vendedor: compare ofertas, monte seu carrinho com
          itens de vendedores diferentes e finalize tudo em uma única compra.
        </p>
      </section>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          Produtos
          {products && <span className="ml-2 text-sm font-normal text-slate-500">({products.length})</span>}
        </h2>
        <input
          className="input sm:w-72"
          placeholder="Buscar produto..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {erro && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      {!erro && products === null && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {products !== null && products.length === 0 && !erro && (
        <div className="card p-10 text-center text-slate-500">
          Nenhum produto encontrado para essa busca.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <Link
            key={product.id}
            href={`/produtos/${product.id}`}
            className="card group block overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="aspect-[16/10] overflow-hidden">
              <ProductCover
                title={product.title}
                seed={product.categoryId + product.title}
                className="transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-4">
              {product.brand && (
                <span className="mb-2 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {product.brand}
                </span>
              )}
              <h3 className="mb-1 font-semibold leading-snug text-slate-900 group-hover:text-brand-700">
                {product.title}
              </h3>
              <p className="line-clamp-2 text-sm text-slate-500">{product.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
