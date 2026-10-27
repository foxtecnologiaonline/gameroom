"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Seller } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { sellerApplicationSchema, type SellerApplicationInput } from "@/lib/schemas";
import { useSeller } from "@/lib/use-seller";
import { RequireAuth } from "@/components/guards/RequireAuth";
import { StatusBadge } from "@/components/StatusBadge";

function ApplyForm({ onApplied }: { onApplied: () => void }) {
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SellerApplicationInput>({ resolver: zodResolver(sellerApplicationSchema) });

  async function onSubmit(data: SellerApplicationInput) {
    setErro(null);
    try {
      await api.post<Seller>(endpoints.sellers, data);
      onApplied();
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <div className="card mx-auto max-w-lg p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Torne-se um vendedor</h1>
      <p className="mb-6 text-sm text-slate-500">
        Cadastre sua loja para anunciar produtos no Gameroom. Seu cadastro passa por aprovação do time Gameroom.
      </p>
      {erro && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label" htmlFor="storeName">
            Nome da loja
          </label>
          <input id="storeName" className="input" {...register("storeName")} />
          {errors.storeName && <p className="field-error">{errors.storeName.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="document">
            CPF/CNPJ
          </label>
          <input id="document" className="input" {...register("document")} />
          {errors.document && <p className="field-error">{errors.document.message}</p>}
        </div>
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar cadastro"}
        </button>
      </form>
    </div>
  );
}

function SellerPanelContent() {
  const { seller, loading, refetch } = useSeller();

  if (loading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  if (!seller) {
    return <ApplyForm onApplied={refetch} />;
  }

  if (seller.status === "pending") {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <StatusBadge status="pending" />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Cadastro em análise</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enviado em {formatarData(seller.createdAt)}. Avisaremos assim que for aprovado.
        </p>
      </div>
    );
  }

  if (seller.status === "rejected" || seller.status === "suspended") {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center">
        <StatusBadge status={seller.status} />
        <h1 className="mt-3 text-xl font-semibold text-slate-900">
          {seller.status === "rejected" ? "Cadastro rejeitado" : "Conta suspensa"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">Entre em contato com o suporte Gameroom para mais detalhes.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{seller.storeName}</h1>
          <StatusBadge status="approved" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/vendedor/produtos/novo" className="btn-primary text-center">
            Cadastrar produto
          </Link>
          <Link href="/vendedor/pedidos" className="btn-secondary text-center">
            Meus pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VendedorPage() {
  return (
    <RequireAuth>
      <SellerPanelContent />
    </RequireAuth>
  );
}
