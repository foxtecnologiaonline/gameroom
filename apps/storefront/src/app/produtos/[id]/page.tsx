"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, endpoints } from "@/lib/api";
import type { Produto, Venda } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { checkoutEmailSchema, type CheckoutEmailInput } from "@/lib/schemas";
import { ProductCover } from "@/components/ProductCover";

const SELOS_CONFIANCA = [
  { titulo: "Entrega automática", descricao: "Liberado assim que o pagamento é confirmado" },
  { titulo: "Pagamento seguro", descricao: "Processado pelo gateway de pagamento" },
  { titulo: "Suporte pós-compra", descricao: "Devolução disponível em caso de problema" },
];

function DetalheSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
      <div className="aspect-[4/3] animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-1/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProdutoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { usuario } = useAuth();

  const [produto, setProduto] = useState<Produto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarFormEmail, setMostrarFormEmail] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [erroCompra, setErroCompra] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutEmailInput>({ resolver: zodResolver(checkoutEmailSchema) });

  useEffect(() => {
    api
      .get<Produto>(endpoints.produtoDetalhe(params.id), { auth: false })
      .then(setProduto)
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.id]);

  async function iniciarCheckout(email?: string) {
    if (!produto) return;
    setComprando(true);
    setErroCompra(null);
    try {
      const venda = await api.post<Venda>(
        endpoints.checkout,
        { produtoId: produto.id, email },
        { auth: !!usuario }
      );
      router.push(`/checkout/${venda.id}`);
    } catch (err) {
      setErroCompra(mensagemErro(err));
    } finally {
      setComprando(false);
    }
  }

  function handleComprarClick() {
    if (usuario) {
      iniciarCheckout();
    } else {
      setMostrarFormEmail(true);
    }
  }

  function onSubmitEmail(data: CheckoutEmailInput) {
    iniciarCheckout(data.email);
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!produto) {
    return <DetalheSkeleton />;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/produtos" className="hover:text-brand-700">
          Produtos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{produto.nome}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl shadow-sm">
          <ProductCover nome={produto.nome} categoria={produto.categoria} imagemUrl={produto.imagemUrl} />
        </div>

        <div>
          <span className="mb-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            {produto.categoria}
          </span>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">{produto.nome}</h1>
          {produto.descricao && <p className="mb-4 whitespace-pre-line text-slate-600">{produto.descricao}</p>}
          <p className="mb-6 text-3xl font-bold text-brand-700">{formatarPreco(produto.preco)}</p>

          {erroCompra && (
            <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroCompra}</div>
          )}

          {!mostrarFormEmail && (
            <button className="btn-primary w-full sm:w-auto" onClick={handleComprarClick} disabled={comprando}>
              {comprando ? "Processando..." : "Comprar agora"}
            </button>
          )}

          {mostrarFormEmail && !usuario && (
            <form onSubmit={handleSubmit(onSubmitEmail)} className="space-y-3 rounded-md border border-slate-200 p-4">
              <p className="text-sm text-slate-600">Informe seu e-mail para continuar a compra:</p>
              <div>
                <input type="email" className="input" placeholder="seu@email.com" {...register("email")} />
                {errors.email && <p className="field-error">{errors.email.message}</p>}
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={comprando}>
                  {comprando ? "Processando..." : "Continuar"}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setMostrarFormEmail(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}

          <dl className="mt-6 space-y-3 border-t border-slate-100 pt-6">
            {SELOS_CONFIANCA.map((selo) => (
              <div key={selo.titulo} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <dt className="text-sm font-medium text-slate-800">{selo.titulo}</dt>
                  <dd className="text-xs text-slate-500">{selo.descricao}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {produto.conteudos && produto.conteudos.length > 0 && (
        <div className="card mt-8 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Conteúdo incluso</h2>
          <ul className="divide-y divide-slate-100">
            {produto.conteudos
              .slice()
              .sort((a, b) => a.ordem - b.ordem)
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-700">{c.titulo}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{c.tipo}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
