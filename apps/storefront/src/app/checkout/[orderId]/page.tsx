"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { Order, Payment, PaymentMethod } from "@/lib/types";
import { formatarCentavos, mensagemErro } from "@/lib/format";
import { RequireAuth } from "@/components/guards/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";

const isDev = process.env.NODE_ENV === "development";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  credit_card: "Cartão de crédito",
  pix: "Pix",
};

function CheckoutContent() {
  const params = useParams<{ orderId: string }>();
  const { toast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("credit_card");
  const [payment, setPayment] = useState<Payment | null>(null);
  const [pagando, setPagando] = useState(false);
  const [simulando, setSimulando] = useState(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());

  const carregarOrder = useCallback(async () => {
    try {
      const data = await api.get<Order>(endpoints.order(params.orderId));
      setOrder(data);
      setErro(null);
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }, [params.orderId]);

  useEffect(() => {
    carregarOrder();
  }, [carregarOrder]);

  const aguardandoConfirmacao = payment?.status === "pending";

  useEffect(() => {
    if (!aguardandoConfirmacao) return;
    const interval = setInterval(carregarOrder, 4000);
    return () => clearInterval(interval);
  }, [aguardandoConfirmacao, carregarOrder]);

  async function pagar() {
    if (!order) return;
    setPagando(true);
    try {
      const result = await api.post<Payment>(
        endpoints.paymentsCharge,
        { orderId: order.id, method },
        { idempotencyKey: idempotencyKeyRef.current }
      );
      setPayment(result);
      if (result.status === "paid") {
        toast("Pagamento confirmado!", "success");
      } else {
        toast("Pagamento em processamento", "info");
      }
      await carregarOrder();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setPagando(false);
    }
  }

  async function simularConfirmacaoPix() {
    if (!payment) return;
    setSimulando(true);
    try {
      await api.post(
        endpoints.paymentsWebhook,
        { gatewayId: payment.gatewayId, status: "paid" },
        { auth: false }
      );
      toast("Webhook simulado — pagamento confirmado", "success");
      setPayment({ ...payment, status: "paid" });
      await carregarOrder();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setSimulando(false);
    }
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!order) {
    return <p className="text-slate-500">Carregando pedido...</p>;
  }

  const todosQuitados = order.subOrders.every((so) => so.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="card p-6">
        <h1 className="mb-1 text-xl font-semibold">Pedido #{order.id.slice(0, 8)}</h1>
        <p className="mb-6 text-sm text-slate-500">
          {order.subOrders.length} vendedor{order.subOrders.length > 1 ? "es" : ""} neste pedido
        </p>

        <div className="mb-6 divide-y divide-slate-100 rounded-md border border-slate-100">
          {order.subOrders.map((subOrder) => (
            <div key={subOrder.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  Vendedor {subOrder.sellerId.slice(0, 8)}
                </p>
                <p className="text-xs text-slate-500">
                  {subOrder.items.length} item{subOrder.items.length > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">
                  {formatarCentavos(subOrder.subtotalCents + subOrder.shippingCents)}
                </span>
                <StatusBadge status={subOrder.status} />
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <span className="text-slate-600">Total do pedido</span>
          <span className="text-xl font-bold text-brand-700">{formatarCentavos(order.totalCents)}</span>
        </div>

        {todosQuitados ? (
          <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
            Pagamento confirmado para todos os vendedores deste pedido.
          </div>
        ) : (
          <>
            {!payment && (
              <div className="space-y-4">
                <div>
                  <p className="label">Forma de pagamento</p>
                  <div className="flex gap-2">
                    {(["credit_card", "pix"] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={method === m ? "btn-primary" : "btn-secondary"}
                      >
                        {METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="btn-primary w-full" onClick={pagar} disabled={pagando}>
                  {pagando ? "Processando..." : `Pagar ${formatarCentavos(order.totalCents)}`}
                </button>
              </div>
            )}

            {aguardandoConfirmacao && (
              <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                <p className="mb-2 font-medium text-slate-700">Aguardando confirmação do pagamento via Pix</p>
                <p>Atualizamos automaticamente assim que o gateway confirmar.</p>
                {isDev && (
                  <button className="btn-secondary mt-3" onClick={simularConfirmacaoPix} disabled={simulando}>
                    {simulando ? "Simulando..." : "Simular confirmação (dev)"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutContent />
    </RequireAuth>
  );
}
