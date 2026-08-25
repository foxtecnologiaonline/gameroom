"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, endpoints } from "@/lib/api";
import type { Devolucao, Venda } from "@/lib/types";
import { formatarData, formatarPreco, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";
import { devolucaoSchema, type DevolucaoInput } from "@/lib/schemas";

export default function MinhaCompraDetalhePage() {
  const params = useParams<{ vendaId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [venda, setVenda] = useState<Venda | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DevolucaoInput>({ resolver: zodResolver(devolucaoSchema) });

  useEffect(() => {
    api
      .get<Venda>(endpoints.minhaCompraDetalhe(params.vendaId))
      .then(setVenda)
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.vendaId]);

  async function onSubmitDevolucao(data: DevolucaoInput) {
    try {
      const devolucao = await api.post<Devolucao>(endpoints.devolucoes, {
        vendaId: params.vendaId,
        motivo: data.motivo,
      });
      toast("Solicitação de devolução enviada", "success");
      setModalAberto(false);
      reset();
      router.push(`/devolucoes/${devolucao.id}`);
    } catch (err) {
      toast(mensagemErro(err), "error");
    }
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!venda) {
    return <p className="text-slate-500">Carregando compra...</p>;
  }

  const nomeProduto = (venda.produto && "nome" in venda.produto ? venda.produto.nome : undefined) || "Produto";

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{nomeProduto}</h1>

      <div className="card mb-6 p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Status</dt>
            <dd>
              <StatusBadge status={venda.status} />
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Valor</dt>
            <dd className="font-medium">{formatarPreco(venda.valor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Data</dt>
            <dd className="font-medium">{formatarData(venda.data || venda.createdAt)}</dd>
          </div>
          {(venda.codigo || venda.chave) && (
            <div className="flex justify-between">
              <dt className="text-slate-500">Código/chave</dt>
              <dd className="font-mono font-medium">{venda.codigo || venda.chave}</dd>
            </div>
          )}
        </dl>
      </div>

      {venda.conteudos && venda.conteudos.length > 0 && (
        <div className="card mb-6 p-6">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Conteúdos para download</h2>
          <ul className="space-y-2">
            {venda.conteudos.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                <span className="text-sm text-slate-700">
                  {c.titulo} <span className="text-slate-400">({c.tipo})</span>
                </span>
                {c.linkAssinado ? (
                  <a href={c.linkAssinado} target="_blank" rel="noopener noreferrer" className="btn-secondary py-1">
                    Baixar
                  </a>
                ) : (
                  <span className="text-xs text-slate-400">Link indisponível</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {venda.status === "confirmada" && (
        <button className="btn-danger" onClick={() => setModalAberto(true)}>
          Solicitar devolução
        </button>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Solicitar devolução</h2>
            <form onSubmit={handleSubmit(onSubmitDevolucao)} className="space-y-4">
              <div>
                <label className="label" htmlFor="motivo">
                  Motivo
                </label>
                <textarea id="motivo" rows={4} className="input" {...register("motivo")} />
                {errors.motivo && <p className="field-error">{errors.motivo.message}</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setModalAberto(false);
                    reset();
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-danger" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Confirmar devolução"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
