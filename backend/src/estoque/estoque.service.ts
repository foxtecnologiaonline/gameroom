import { Injectable } from "@nestjs/common";
import { DbService, ResumoEstoque, StatusUnidadeEstoque } from "../db/db.service";

const STATUS_ORDEM: StatusUnidadeEstoque[] = ["disponivel", "reservado", "vendido", "devolvido", "bloqueado"];

@Injectable()
export class EstoqueService {
  constructor(private readonly db: DbService) {}

  resumoEUnidades(produtoId: string) {
    const unidades = this.db.data.unidadesEstoque
      .filter((u) => u.produtoId === produtoId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const resumo = STATUS_ORDEM.reduce((acc, status) => {
      acc[status] = unidades.filter((u) => u.status === status).length;
      return acc;
    }, {} as ResumoEstoque);
    return { resumo, unidades };
  }

  listarReabastecimentos() {
    return this.db.data.reabastecimentos
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => {
        const produto = this.db.data.produtos.find((p) => p.id === r.produtoId);
        return { ...r, data: r.createdAt, produto: produto ? { id: produto.id, nome: produto.nome } : undefined };
      });
  }
}
