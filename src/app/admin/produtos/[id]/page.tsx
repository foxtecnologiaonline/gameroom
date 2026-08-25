"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, endpoints } from "@/lib/api";
import type { ConteudoProduto, Produto } from "@/lib/types";
import { ProdutoForm } from "@/components/admin/ProdutoForm";
import { useToast } from "@/lib/toast-context";
import { mensagemErro } from "@/lib/format";
import type { ProdutoInput } from "@/lib/schemas";
import { conteudoSchema, type ConteudoInput } from "@/lib/schemas";

function SecaoConteudos({ produtoId, conteudos, onUploaded }: {
  produtoId: string;
  conteudos: ConteudoProduto[];
  onUploaded: (c: ConteudoProduto) => void;
}) {
  const { toast } = useToast();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ConteudoInput>({ resolver: zodResolver(conteudoSchema), defaultValues: { ordem: 0 } });

  async function onSubmit(data: ConteudoInput) {
    if (!arquivo) {
      toast("Selecione um arquivo", "error");
      return;
    }
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    formData.append("tipo", data.tipo);
    formData.append("titulo", data.titulo);
    formData.append("ordem", String(data.ordem));

    try {
      const conteudo = await api.upload<ConteudoProduto>(endpoints.produtoConteudos(produtoId), formData);
      toast("Conteúdo enviado com sucesso", "success");
      onUploaded(conteudo);
      reset({ tipo: "", titulo: "", ordem: 0 });
      setArquivo(null);
    } catch (err) {
      toast(mensagemErro(err), "error");
    }
  }

  return (
    <div className="card p-6">
      <h2 className="mb-4 text-lg font-semibold">Conteúdos</h2>

      {conteudos.length > 0 ? (
        <ul className="mb-6 space-y-2">
          {conteudos
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{c.titulo}</span>{" "}
                  <span className="text-slate-400">({c.tipo}, ordem {c.ordem})</span>
                </span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="mb-6 text-sm text-slate-500">Nenhum conteúdo vinculado ainda.</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t border-slate-100 pt-4">
        <p className="text-sm font-medium text-slate-700">Adicionar conteúdo</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="tipo">
              Tipo
            </label>
            <input id="tipo" className="input" placeholder="ex: arquivo, chave, video" {...register("tipo")} />
            {errors.tipo && <p className="field-error">{errors.tipo.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="ordem">
              Ordem
            </label>
            <input id="ordem" type="number" className="input" {...register("ordem")} />
            {errors.ordem && <p className="field-error">{errors.ordem.message}</p>}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="titulo">
            Título
          </label>
          <input id="titulo" className="input" {...register("titulo")} />
          {errors.titulo && <p className="field-error">{errors.titulo.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="arquivo">
            Arquivo
          </label>
          <input
            id="arquivo"
            type="file"
            className="input"
            onChange={(e) => setArquivo(e.target.files?.[0] || null)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? "Enviando..." : "Enviar conteúdo"}
        </button>
      </form>
    </div>
  );
}

export default function EditarProdutoPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [produto, setProduto] = useState<Produto | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Produto>(endpoints.produtoDetalhe(params.id))
      .then(setProduto)
      .catch((err) => setErro(mensagemErro(err)));
  }, [params.id]);

  async function handleSubmit(data: ProdutoInput) {
    try {
      const atualizado = await api.patch<Produto>(endpoints.produtoDetalhe(params.id), data);
      setProduto((prev) => (prev ? { ...prev, ...atualizado } : atualizado));
      toast("Produto atualizado com sucesso", "success");
    } catch (err) {
      toast(mensagemErro(err), "error");
    }
  }

  function handleConteudoUploaded(conteudo: ConteudoProduto) {
    setProduto((prev) => (prev ? { ...prev, conteudos: [...(prev.conteudos || []), conteudo] } : prev));
  }

  if (erro) {
    return <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>;
  }

  if (!produto) {
    return <p className="text-slate-500">Carregando produto...</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Editar produto</h1>
      <div className="card p-6">
        <ProdutoForm produto={produto} onSubmit={handleSubmit} submitLabel="Salvar alterações" />
      </div>
      <SecaoConteudos produtoId={produto.id} conteudos={produto.conteudos || []} onUploaded={handleConteudoUploaded} />
    </div>
  );
}
