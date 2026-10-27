"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { Cart, Order, ProductWithOffers } from "@/lib/types";
import { formatarCentavos, mensagemErro } from "@/lib/format";
import { RequireAuth } from "@/components/guards/RequireAuth";
import { useToast } from "@/lib/toast-context";

function CarrinhoContent() {
  const router = useRouter();
  const { toast } = useToast();

  const [cart, setCart] = useState<Cart | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [productTitles, setProductTitles] = useState<Record<string, string>>({});

  const carregarCarrinho = useCallback(async () => {
    try {
      const data = await api.get<Cart>(endpoints.cart);
      setCart(data);
      setErro(null);
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }, []);

  useEffect(() => {
    carregarCarrinho();
  }, [carregarCarrinho]);

  const productIds = useMemo(
    () => Array.from(new Set((cart?.items ?? []).map((item) => item.offer.productId))),
    [cart]
  );

  useEffect(() => {
    productIds.forEach((productId) => {
      if (productTitles[productId]) return;
      api
        .get<ProductWithOffers>(endpoints.product(productId), { auth: false })
        .then((product) => setProductTitles((cur) => ({ ...cur, [productId]: product.title })))
        .catch(() => {
          // segue mostrando o fallback por id se um produto individual falhar
        });
    });
  }, [productIds, productTitles]);

  async function removerItem(id: string) {
    setRemovingId(id);
    try {
      await api.del(endpoints.cartItem(id));
      await carregarCarrinho();
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setRemovingId(null);
    }
  }

  async function finalizarCompra() {
    setFinalizando(true);
    try {
      const order = await api.post<Order>(
        endpoints.checkout,
        undefined,
        { idempotencyKey: crypto.randomUUID() }
      );
      router.push(`/checkout/${order.id}`);
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setFinalizando(false);
    }
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!cart) {
    return <p className="text-slate-500">Carregando carrinho...</p>;
  }

  const total = cart.items.reduce((sum, item) => sum + item.offer.priceCents * item.quantity, 0);

  if (cart.items.length === 0) {
    return (
      <div className="card mx-auto max-w-lg p-10 text-center text-slate-500">
        Seu carrinho está vazio.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Carrinho</h1>

      <div className="card divide-y divide-slate-100">
        {cart.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="font-medium text-slate-900">
                {productTitles[item.offer.productId] ?? "Carregando..."}
              </p>
              <p className="text-sm text-slate-500">
                {item.quantity}x {formatarCentavos(item.offer.priceCents)}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <p className="font-semibold text-slate-900">
                {formatarCentavos(item.offer.priceCents * item.quantity)}
              </p>
              <button
                className="btn-secondary py-1"
                onClick={() => removerItem(item.id)}
                disabled={removingId === item.id}
              >
                {removingId === item.id ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-4 flex items-center justify-between px-6 py-4">
        <span className="text-slate-600">Total</span>
        <span className="text-xl font-bold text-brand-700">{formatarCentavos(total)}</span>
      </div>

      <button className="btn-primary mt-4 w-full" onClick={finalizarCompra} disabled={finalizando}>
        {finalizando ? "Processando..." : "Finalizar compra"}
      </button>
    </div>
  );
}

export default function CarrinhoPage() {
  return (
    <RequireAuth>
      <CarrinhoContent />
    </RequireAuth>
  );
}
