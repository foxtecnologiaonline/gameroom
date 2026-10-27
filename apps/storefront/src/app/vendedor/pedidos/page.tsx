"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { SubOrder } from "@/lib/types";
import { formatarCentavos, formatarData, mensagemErro } from "@/lib/format";
import { useSeller } from "@/lib/use-seller";
import { RequireAuth } from "@/components/guards/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";

function LabelForm({ subOrderId, onDone }: { subOrderId: string; onDone: () => void }) {
  const { toast } = useToast();
  const [destinationZip, setDestinationZip] = useState("");
  const [weightGrams, setWeightGrams] = useState("500");
  const [carrier, setCarrier] = useState("correios-pac");
  const [enviando, setEnviando] = useState(false);

  async function gerarEtiqueta() {
    setEnviando(true);
    try {
      await api.post(endpoints.shippingLabel, {
        subOrderId,
        destinationZip,
        weightGrams: Number(weightGrams),
        carrier,
      });
      toast("Etiqueta gerada", "success");
      onDone();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-md bg-slate-50 p-3">
      <div>
        <label className="label">CEP de destino</label>
        <input
          className="input w-32"
          placeholder="01310-100"
          value={destinationZip}
          onChange={(e) => setDestinationZip(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Peso (g)</label>
        <input
          className="input w-24"
          type="number"
          min="1"
          value={weightGrams}
          onChange={(e) => setWeightGrams(e.target.value)}
        />
      </div>
      <div>
        <label className="label">Transportadora</label>
        <select className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)}>
          <option value="correios-pac">Correios PAC</option>
          <option value="correios-sedex">Correios SEDEX</option>
        </select>
      </div>
      <button
        className="btn-primary"
        onClick={gerarEtiqueta}
        disabled={enviando || destinationZip.length < 8}
      >
        {enviando ? "Gerando..." : "Confirmar"}
      </button>
    </div>
  );
}

function SubOrderRow({ subOrder, onChanged }: { subOrder: SubOrder; onChanged: () => void }) {
  const { toast } = useToast();
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [marcando, setMarcando] = useState(false);

  async function marcarEntregue() {
    setMarcando(true);
    try {
      await api.patch(endpoints.subOrderStatus(subOrder.id), { status: "delivered" });
      toast("SubOrder marcado como entregue", "success");
      onChanged();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setMarcando(false);
    }
  }

  return (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium text-slate-900">Pedido {subOrder.id.slice(0, 8)}</p>
          <p className="text-sm text-slate-500">
            {subOrder.items.length} item{subOrder.items.length > 1 ? "s" : ""} ·{" "}
            {formatarData(subOrder.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900">
            {formatarCentavos(subOrder.subtotalCents + subOrder.shippingCents)}
          </span>
          <StatusBadge status={subOrder.status} />
        </div>
      </div>

      {subOrder.status === "paid" && !showLabelForm && (
        <button className="btn-secondary mt-3" onClick={() => setShowLabelForm(true)}>
          Gerar etiqueta
        </button>
      )}
      {subOrder.status === "paid" && showLabelForm && (
        <LabelForm subOrderId={subOrder.id} onDone={onChanged} />
      )}

      {subOrder.status === "shipped" && (
        <button className="btn-secondary mt-3" onClick={marcarEntregue} disabled={marcando}>
          {marcando ? "Marcando..." : "Marcar como entregue"}
        </button>
      )}
    </div>
  );
}

function OrdersList() {
  const { seller, loading: loadingSeller } = useSeller();
  const [subOrders, setSubOrders] = useState<SubOrder[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    if (!seller) return;
    api
      .get<SubOrder[]>(endpoints.sellerOrders(seller.id))
      .then(setSubOrders)
      .catch((err) => setErro(mensagemErro(err)));
  }, [seller]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (loadingSeller) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  if (!seller || seller.status !== "approved") {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center text-slate-500">
        Você precisa ser um vendedor aprovado para ver pedidos.
        <div className="mt-4">
          <Link href="/vendedor" className="btn-primary">
            Ir para o painel do vendedor
          </Link>
        </div>
      </div>
    );
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (subOrders === null) {
    return <p className="text-slate-500">Carregando pedidos...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Meus pedidos</h1>

      {subOrders.length === 0 && (
        <div className="card p-10 text-center text-slate-500">Nenhum pedido ainda.</div>
      )}

      <div className="card divide-y divide-slate-100">
        {subOrders.map((subOrder) => (
          <SubOrderRow key={subOrder.id} subOrder={subOrder} onChanged={carregar} />
        ))}
      </div>
    </div>
  );
}

export default function PedidosPage() {
  return (
    <RequireAuth>
      <OrdersList />
    </RequireAuth>
  );
}
