"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, endpoints } from "@/lib/api";
import type { Category, Offer, Product } from "@/lib/types";
import { mensagemErro } from "@/lib/format";
import { productFormSchema, type ProductFormInput } from "@/lib/schemas";
import { useSeller } from "@/lib/use-seller";
import { RequireAuth } from "@/components/guards/RequireAuth";

const CONDITION_LABELS: Record<string, string> = {
  new: "Novo",
  used: "Usado",
};

function NewProductForm() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { condition: "new" },
  });

  useEffect(() => {
    api
      .get<Category[]>(endpoints.categories, { auth: false })
      .then(setCategories)
      .catch((err) => setErro(mensagemErro(err)));
  }, []);

  async function onSubmit(data: ProductFormInput) {
    setErro(null);
    try {
      const product = await api.post<Product>(endpoints.products, {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        brand: data.brand || undefined,
      });
      await api.post<Offer>(endpoints.productOffers(product.id), {
        priceCents: Math.round(data.priceReais * 100),
        stock: data.stock,
        condition: data.condition,
        slaDays: data.slaDays,
      });
      router.push("/vendedor/pedidos");
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <div className="card mx-auto max-w-xl p-6">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Cadastrar produto</h1>
      <p className="mb-6 text-sm text-slate-500">Cria o produto e já publica uma oferta para ele.</p>

      {erro && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="label" htmlFor="title">
            Título
          </label>
          <input id="title" className="input" {...register("title")} />
          {errors.title && <p className="field-error">{errors.title.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="description">
            Descrição
          </label>
          <textarea id="description" className="input" rows={4} {...register("description")} />
          {errors.description && <p className="field-error">{errors.description.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="categoryId">
            Categoria
          </label>
          <select id="categoryId" className="input" {...register("categoryId")} defaultValue="">
            <option value="" disabled>
              {categories === null ? "Carregando..." : "Selecione"}
            </option>
            {categories?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="field-error">{errors.categoryId.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="brand">
            Marca (opcional)
          </label>
          <input id="brand" className="input" {...register("brand")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="priceReais">
              Preço (R$)
            </label>
            <input id="priceReais" type="number" step="0.01" min="0.01" className="input" {...register("priceReais")} />
            {errors.priceReais && <p className="field-error">{errors.priceReais.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="stock">
              Estoque
            </label>
            <input id="stock" type="number" min="0" className="input" {...register("stock")} />
            {errors.stock && <p className="field-error">{errors.stock.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="condition">
              Condição
            </label>
            <select id="condition" className="input" {...register("condition")}>
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="slaDays">
              Prazo de envio (dias)
            </label>
            <input id="slaDays" type="number" min="0" className="input" {...register("slaDays")} />
            {errors.slaDays && <p className="field-error">{errors.slaDays.message}</p>}
          </div>
        </div>

        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Publicando..." : "Publicar produto"}
        </button>
      </form>
    </div>
  );
}

function NewProductGate() {
  const { seller, loading } = useSeller();

  if (loading) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  if (!seller || seller.status !== "approved") {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center text-slate-500">
        Você precisa ser um vendedor aprovado para cadastrar produtos.
        <div className="mt-4">
          <Link href="/vendedor" className="btn-primary">
            Ir para o painel do vendedor
          </Link>
        </div>
      </div>
    );
  }

  return <NewProductForm />;
}

export default function NovoProdutoPage() {
  return (
    <RequireAuth>
      <NewProductGate />
    </RequireAuth>
  );
}
