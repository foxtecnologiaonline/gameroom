"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, endpoints } from "@/lib/api";
import type { Produto, Venda } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { checkoutEmailSchema, type CheckoutEmailInput } from "@/lib/schemas";

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
    return <p className="text-slate-500">Carregando produto...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6">
        <span className="mb-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
          {produto.categoria}
        </span>
        <h1 className="mb-2 text-2xl font-bold">{produto.nome}</h1>
        {produto.descricao && <p className="mb-4 whitespace-pre-line text-slate-600">{produto.descricao}</p>}
        <p className="mb-6 text-3xl font-bold text-brand-700">{formatarPreco(produto.preco)}</p>

        {produto.conteudos && produto.conteudos.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Conteúdo incluso</h2>
            <ul className="list-inside list-disc text-sm text-slate-600">
              {produto.conteudos
                .slice()
                .sort((a, b) => a.ordem - b.ordem)
                .map((c) => (
                  <li key={c.id}>
                    {c.titulo} <span className="text-slate-400">({c.tipo})</span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {erroCompra && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erroCompra}</div>
        )}

        {!mostrarFormEmail && (
          <button className="btn-primary" onClick={handleComprarClick} disabled={comprando}>
            {comprando ? "Processando..." : "Comprar"}
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
      </div>
    </div>
  );
}
