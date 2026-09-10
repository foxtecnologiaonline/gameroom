"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { Venda } from "@/lib/types";
import { formatarPreco, mensagemErro } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";

const isDev = process.env.NODE_ENV === "development";

export default function CheckoutVendaPage() {
  const params = useParams<{ vendaId: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [venda, setVenda] = useState<Venda | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [simulando, setSimulando] = useState(false);

  const carregarVenda = useCallback(async () => {
    try {
      const data = await api.get<Venda>(endpoints.venda(params.vendaId), { auth: false });
      setVenda(data);
      setErro(null);
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }, [params.vendaId]);

  useEffect(() => {
    carregarVenda();
    const interval = setInterval(carregarVenda, 5000);
    return () => clearInterval(interval);
  }, [carregarVenda]);

  useEffect(() => {
    if (venda?.status === "confirmada") {
      router.push("/checkout/sucesso");
    }
  }, [venda, router]);

  async function simularPagamentoAprovado() {
    setSimulando(true);
    try {
      await api.post(endpoints.simularWebhookPagamento, { vendaId: params.vendaId, status: "aprovado" }, { auth: false });
      toast("Pagamento simulado com sucesso", "success");
      await carregarVenda();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setSimulando(false);
    }
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!venda) {
    return <p className="text-slate-500">Carregando pedido...</p>;
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <h1 className="mb-4 text-xl font-semibold">Pedido #{venda.id}</h1>

        <div className="mb-4 flex items-center justify-between">
          <span className="text-slate-600">Status</span>
          <StatusBadge status={venda.status} />
        </div>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-slate-600">Valor</span>
          <span className="text-xl font-bold text-brand-700">{formatarPreco(venda.valor)}</span>
        </div>

        {venda.status !== "confirmada" && (
          <div className="mb-6 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-2 font-medium text-slate-700">Instruções de pagamento</p>
            {venda.checkoutUrl ? (
              <a
                href={venda.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                Abrir página de pagamento
              </a>
            ) : (
              <p>Aguardando geração do link de pagamento pelo gateway.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={carregarVenda}>
            Atualizar status
          </button>
          {isDev && venda.status !== "confirmada" && (
            <button className="btn-primary" onClick={simularPagamentoAprovado} disabled={simulando}>
              {simulando ? "Simulando..." : "Simular pagamento aprovado"}
            </button>
          )}
        </div>
        {isDev && (
          <p className="mt-3 text-xs text-slate-400">
            Botão visível apenas em ambiente de desenvolvimento — chama o webhook de pagamento diretamente
            enquanto o gateway real não está integrado.
          </p>
        )}
      </div>
    </div>
  );
}
