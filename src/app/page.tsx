"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { formatarPreco } from "@/lib/format";
import { ProductCover } from "@/components/ProductCover";

const ICONES_CATEGORIA: Record<string, string> = {
  "Chave de Jogo": "🎮",
  "Gift Card": "🎁",
  Assinatura: "⭐",
  DLC: "➕",
};

function IconeCategoria({ categoria }: { categoria: string }) {
  return <span className="text-2xl">{ICONES_CATEGORIA[categoria] || "🕹️"}</span>;
}

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

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[] | null>(null);

  useEffect(() => {
    api
      .get<Produto[]>(endpoints.produtos, { auth: false })
      .then((data) => setProdutos(Array.isArray(data) ? data : []))
      .catch(() => setProdutos([]));
  }, []);

  const categorias = useMemo(() => {
    if (!produtos) return [];
    return Array.from(new Set(produtos.map((p) => p.categoria)));
  }, [produtos]);

  const destaques = produtos?.slice(0, 6) ?? [];

  return (
    <div>
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 py-14 text-white sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-64 w-64 rounded-full bg-violet-400/20 blur-2xl" />
        <div className="relative max-w-xl">
          <span className="eyebrow bg-white/15 text-white">Marketplace de ativos digitais</span>
          <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-5xl">
            Chaves, gift cards e assinaturas com entrega automática
          </h1>
          <p className="mt-4 max-w-lg text-brand-100 sm:text-lg">
            Compre agora e receba seu código assim que o pagamento é confirmado — sem espera, sem burocracia.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/produtos" className="btn-accent px-6 py-3 text-base">
              Explorar produtos
            </Link>
            <Link href="/registro" className="btn px-6 py-3 text-base text-white ring-1 ring-inset ring-white/40 hover:bg-white/10">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {categorias.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title mb-5">Categorias</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {categorias.map((categoria) => (
              <Link
                key={categoria}
                href={`/produtos?categoria=${encodeURIComponent(categoria)}`}
                className="card card-hover flex flex-col items-center gap-2 px-4 py-6 text-center"
              >
                <IconeCategoria categoria={categoria} />
                <span className="text-sm font-medium text-slate-800">{categoria}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="section-title">Em destaque</h2>
          <Link href="/produtos" className="text-sm font-medium text-brand-700 hover:underline">
            Ver todos &rarr;
          </Link>
        </div>

        {produtos === null && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {produtos !== null && destaques.length === 0 && (
          <div className="card p-10 text-center text-slate-500">Nenhum produto disponível no momento.</div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {destaques.map((produto) => (
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
      </section>

      <section className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { titulo: "Entrega automática", desc: "Código liberado assim que o pagamento é confirmado." },
          { titulo: "Pagamento seguro", desc: "Checkout processado por gateway de pagamento confiável." },
          { titulo: "Devolução facilitada", desc: "Solicite devolução em poucos cliques direto na sua conta." },
        ].map((item) => (
          <div key={item.titulo} className="card p-6">
            <p className="mb-1 font-semibold text-slate-900">{item.titulo}</p>
            <p className="text-sm text-slate-500">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
