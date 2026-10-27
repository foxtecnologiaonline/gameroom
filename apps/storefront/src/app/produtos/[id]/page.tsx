"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { ProductWithOffers, SellerPublic } from "@/lib/types";
import { formatarCentavos, mensagemErro } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ProductCover } from "@/components/ProductCover";

const CONDITION_LABELS: Record<string, string> = {
  new: "Novo",
  used: "Usado",
};

function DetailSkeleton() {
  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
      <div className="aspect-[4/3] animate-pulse rounded-lg bg-slate-200" />
      <div className="space-y-3">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-7 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [product, setProduct] = useState<ProductWithOffers | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sellerNames, setSellerNames] = useState<Record<string, string>>({});
  const [addingOfferId, setAddingOfferId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ProductWithOffers>(endpoints.product(params.id), { auth: false })
      .then(setProduct)
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.id]);

  const sellerIds = useMemo(
    () => Array.from(new Set((product?.offers ?? []).map((o) => o.sellerId))),
    [product]
  );

  useEffect(() => {
    sellerIds.forEach((sellerId) => {
      if (sellerNames[sellerId]) return;
      api
        .get<SellerPublic>(endpoints.sellerPublic(sellerId), { auth: false })
        .then((seller) => setSellerNames((cur) => ({ ...cur, [sellerId]: seller.storeName })))
        .catch(() => {
          // vitrine não deve quebrar se um seller individual falhar ao resolver
        });
    });
  }, [sellerIds, sellerNames]);

  async function addToCart(offerId: string) {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/produtos/${params.id}`)}`);
      return;
    }
    setAddingOfferId(offerId);
    try {
      await api.post(endpoints.cartItems, { offerId, quantity: 1 });
      toast("Item adicionado ao carrinho", "success");
    } catch (err) {
      toast(mensagemErro(err), "error");
    } finally {
      setAddingOfferId(null);
    }
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!product) {
    return <DetailSkeleton />;
  }

  const offers = [...product.offers].sort((a, b) => a.priceCents - b.priceCents);

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">
          Produtos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">{product.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-xl shadow-sm">
          <ProductCover title={product.title} seed={product.categoryId + product.title} />
        </div>

        <div>
          {product.brand && (
            <span className="mb-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {product.brand}
            </span>
          )}
          <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">{product.title}</h1>
          <p className="whitespace-pre-line text-slate-600">{product.description}</p>
        </div>
      </div>

      <div className="card mt-8 overflow-hidden">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Ofertas ({offers.length})
        </h2>

        {offers.length === 0 && (
          <p className="px-6 py-8 text-center text-slate-500">
            Nenhuma oferta disponível para este produto no momento.
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {offers.map((offer) => (
            <li key={offer.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {sellerNames[offer.sellerId] ?? "Carregando vendedor..."}
                  {offer.isBuyboxWinner && (
                    <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                      Melhor oferta
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  {CONDITION_LABELS[offer.condition] ?? offer.condition} · Envio em até {offer.slaDays}{" "}
                  {offer.slaDays === 1 ? "dia" : "dias"} ·{" "}
                  {offer.stock > 0 ? `${offer.stock} em estoque` : "sem estoque"}
                </p>
              </div>
              <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                <p className="text-xl font-bold text-brand-700">{formatarCentavos(offer.priceCents)}</p>
                <button
                  className="btn-primary"
                  onClick={() => addToCart(offer.id)}
                  disabled={offer.stock === 0 || addingOfferId === offer.id}
                >
                  {addingOfferId === offer.id ? "Adicionando..." : "Adicionar ao carrinho"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
