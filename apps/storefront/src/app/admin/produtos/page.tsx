"use client";

import { useCallback, useEffect, useState } from "react";
import { api, endpoints } from "@/lib/api";
import type { Product } from "@/lib/types";
import { formatarData, mensagemErro } from "@/lib/format";
import { RequireAdmin } from "@/components/guards/RequireAdmin";
import { useToast } from "@/lib/toast-context";

function ProductRow({ product, onChanged }: { product: Product; onChanged: () => void }) {
  const { toast } = useToast();
  const [working, setWorking] = useState(false);
  const suspended = product.suspendedAt !== null;

  async function toggle() {
    setWorking(true);
    try {
      await api.patch(endpoints.productModeration(product.id), { suspended: !suspended });
      toast(suspended ? "Produto reativado" : "Produto suspenso", "success");
      onChanged();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
      <div>
        <p className="font-medium text-slate-900">{product.title}</p>
        <p className="text-sm text-slate-500">
          Cadastrado em {formatarData(product.createdAt)}
          {suspended && ` · suspenso em ${formatarData(product.suspendedAt ?? undefined)}`}
        </p>
      </div>
      <button className={suspended ? "btn-primary" : "btn-danger"} onClick={toggle} disabled={working}>
        {working ? "Aplicando..." : suspended ? "Reativar" : "Suspender"}
      </button>
    </div>
  );
}

function AdminProductsContent() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(() => {
    api
      .get<Product[]>(endpoints.productsAdmin)
      .then(setProducts)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (products === null) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Moderação de catálogo</h1>

      {products.length === 0 && (
        <div className="card p-10 text-center text-slate-500">Nenhum produto cadastrado ainda.</div>
      )}

      <div className="card divide-y divide-slate-100">
        {products.map((product) => (
          <ProductRow key={product.id} product={product} onChanged={carregar} />
        ))}
      </div>
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <RequireAdmin>
      <AdminProductsContent />
    </RequireAdmin>
  );
}
