"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { produtoSchema, type ProdutoInput } from "@/lib/schemas";
import type { Produto } from "@/lib/types";

interface ProdutoFormProps {
  produto?: Produto;
  onSubmit: (data: ProdutoInput) => Promise<void> | void;
  submitLabel: string;
}

export function ProdutoForm({ produto, onSubmit, submitLabel }: ProdutoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProdutoInput>({
    resolver: zodResolver(produtoSchema),
    defaultValues: produto
      ? {
          nome: produto.nome,
          descricao: produto.descricao,
          preco: produto.preco,
          categoria: produto.categoria,
          status: produto.status,
          estoqueLotePadrao: produto.estoqueLotePadrao,
          limiarReabastecimento: produto.limiarReabastecimento,
        }
      : { status: "rascunho" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label" htmlFor="nome">
          Nome
        </label>
        <input id="nome" className="input" {...register("nome")} />
        {errors.nome && <p className="field-error">{errors.nome.message}</p>}
      </div>

      <div>
        <label className="label" htmlFor="descricao">
          Descrição
        </label>
        <textarea id="descricao" rows={4} className="input" {...register("descricao")} />
        {errors.descricao && <p className="field-error">{errors.descricao.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="preco">
            Preço (R$)
          </label>
          <input id="preco" type="number" step="0.01" className="input" {...register("preco")} />
          {errors.preco && <p className="field-error">{errors.preco.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="categoria">
            Categoria
          </label>
          <input id="categoria" className="input" {...register("categoria")} />
          {errors.categoria && <p className="field-error">{errors.categoria.message}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="status">
          Status
        </label>
        <select id="status" className="input" {...register("status")}>
          <option value="rascunho">Rascunho</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        {errors.status && <p className="field-error">{errors.status.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="estoqueLotePadrao">
            Estoque lote padrão
          </label>
          <input id="estoqueLotePadrao" type="number" className="input" {...register("estoqueLotePadrao")} />
          {errors.estoqueLotePadrao && <p className="field-error">{errors.estoqueLotePadrao.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="limiarReabastecimento">
            Limiar de reabastecimento
          </label>
          <input
            id="limiarReabastecimento"
            type="number"
            className="input"
            {...register("limiarReabastecimento")}
          />
          {errors.limiarReabastecimento && <p className="field-error">{errors.limiarReabastecimento.message}</p>}
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : submitLabel}
      </button>
    </form>
  );
}
