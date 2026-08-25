"use client";

import { useRouter } from "next/navigation";
import { api, endpoints } from "@/lib/api";
import type { Produto } from "@/lib/types";
import { ProdutoForm } from "@/components/admin/ProdutoForm";
import { useToast } from "@/lib/toast-context";
import { mensagemErro } from "@/lib/format";
import type { ProdutoInput } from "@/lib/schemas";

export default function NovoProdutoPage() {
  const router = useRouter();
  const { toast } = useToast();

  async function handleSubmit(data: ProdutoInput) {
    try {
      const produto = await api.post<Produto>(endpoints.produtos, data);
      toast("Produto criado com sucesso", "success");
      router.push(`/admin/produtos/${produto.id}`);
    } catch (err) {
      toast(mensagemErro(err), "error");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Novo produto</h1>
      <div className="card p-6">
        <ProdutoForm onSubmit={handleSubmit} submitLabel="Criar produto" />
      </div>
    </div>
  );
}
