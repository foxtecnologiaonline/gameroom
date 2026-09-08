import { db, type ResumoEstoque, type StatusUnidadeEstoque } from "./db";

const STATUS_ORDEM: StatusUnidadeEstoque[] = ["disponivel", "reservado", "vendido", "devolvido", "bloqueado"];

export function resumoEUnidades(produtoId: string) {
  const unidades = db.data.unidadesEstoque
    .filter((u) => u.produtoId === produtoId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const resumo = STATUS_ORDEM.reduce((acc, status) => {
    acc[status] = unidades.filter((u) => u.status === status).length;
    return acc;
  }, {} as ResumoEstoque);
  return { resumo, unidades };
}

export function listarReabastecimentos() {
  return db.data.reabastecimentos
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const produto = db.data.produtos.find((p) => p.id === r.produtoId);
      return { ...r, data: r.createdAt, produto: produto ? { id: produto.id, nome: produto.nome } : undefined };
    });
}
