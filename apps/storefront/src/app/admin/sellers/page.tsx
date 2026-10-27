"use client";

import { useCallback, useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Seller } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { RequireAdmin } from "@/components/guards/RequireAdmin";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/lib/toast-context";

function PendingRow({ seller, onDone }: { seller: Seller; onDone: () => void }) {
  const { toast } = useToast();
  const [working, setWorking] = useState<"approved" | "rejected" | null>(null);

  async function decide(status: "approved" | "rejected") {
    setWorking(status);
    try {
      await api.patch(endpoints.sellerStatus(seller.id), { status });
      toast(status === "approved" ? "Vendedor aprovado" : "Vendedor rejeitado", "success");
      onDone();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <div>
        <p className="font-medium text-slate-900">{seller.storeName}</p>
        <p className="text-sm text-slate-500">
          {seller.document} · aplicou em {formatarData(seller.createdAt)}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary"
          onClick={() => decide("approved")}
          disabled={working !== null}
        >
          {working === "approved" ? "Aprovando..." : "Aprovar"}
        </button>
        <button
          className="btn-danger"
          onClick={() => decide("rejected")}
          disabled={working !== null}
        >
          {working === "rejected" ? "Rejeitando..." : "Rejeitar"}
        </button>
      </div>
    </div>
  );
}

function AdminSellersContent() {
  const [sellers, setSellers] = useState<Seller[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api
      .get<Seller[]>(endpoints.sellers)
      .then(setSellers)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (sellers === null) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  const pending = sellers.filter((s) => s.status === "pending");
  const reviewed = sellers.filter((s) => s.status !== "pending");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Aprovação de vendedores</h1>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Pendentes ({pending.length})
      </h2>
      {pending.length === 0 ? (
        <div className="card mb-8 p-6 text-center text-slate-500">Nenhuma aplicação pendente.</div>
      ) : (
        <div className="card mb-8 divide-y divide-slate-100">
          {pending.map((seller) => (
            <PendingRow key={seller.id} seller={seller} onDone={carregar} />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Já revisados
          </h2>
          <div className="card divide-y divide-slate-100">
            {reviewed.map((seller) => (
              <div key={seller.id} className="flex items-center justify-between px-6 py-3">
                <p className="text-sm text-slate-700">{seller.storeName}</p>
                <StatusBadge status={seller.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSellersPage() {
  return (
    <RequireAdmin>
      <AdminSellersContent />
    </RequireAdmin>
  );
}
