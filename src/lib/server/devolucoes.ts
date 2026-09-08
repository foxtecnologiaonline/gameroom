import { db, type Devolucao, type Usuario } from "./db";
import { ApiError } from "./auth";
import * as vendasLib from "./vendas";

const JANELA_APROVACAO_AUTOMATICA_HORAS = 24;

function enriquecer(devolucao: Devolucao) {
  return { ...devolucao, data: devolucao.createdAt };
}

function aplicarReembolso(vendaId: string) {
  const venda = vendasLib.buscarOuFalhar(vendaId);
  venda.status = "reembolsada";
  const unidade = db.data.unidadesEstoque.find((u) => u.vendaId === venda.id && u.status === "vendido");
  if (unidade) unidade.status = "devolvido";
}

export function criar(vendaId: string, motivo: string, usuario: Usuario) {
  const venda = vendasLib.obterDoUsuario(vendaId, usuario);
  if (venda.status !== "confirmada") {
    throw new ApiError(400, "Só é possível solicitar devolução de uma compra confirmada");
  }
  if (db.data.devolucoes.some((d) => d.vendaId === vendaId)) {
    throw new ApiError(400, "Já existe uma solicitação de devolução para essa compra");
  }

  const horasDesdeCompra = (Date.now() - new Date(venda.createdAt).getTime()) / 3_600_000;
  const aprovadaAutomaticamente = horasDesdeCompra <= JANELA_APROVACAO_AUTOMATICA_HORAS;

  const devolucao: Devolucao = {
    id: crypto.randomUUID(),
    vendaId,
    motivo,
    status: aprovadaAutomaticamente ? "aprovada_automatica" : "pendente",
    createdAt: new Date().toISOString(),
  };
  db.data.devolucoes.push(devolucao);
  if (aprovadaAutomaticamente) aplicarReembolso(vendaId);
  db.persist();
  return enriquecer(devolucao);
}

export function buscarOuFalhar(id: string): Devolucao {
  const devolucao = db.data.devolucoes.find((d) => d.id === id);
  if (!devolucao) throw new ApiError(404, "Devolução não encontrada");
  return devolucao;
}

export function obterDoUsuario(id: string, usuario: Usuario) {
  const devolucao = buscarOuFalhar(id);
  const venda = vendasLib.buscarOuFalhar(devolucao.vendaId);
  if (!vendasLib.pertenceAoUsuario(venda, usuario)) throw new ApiError(404, "Devolução não encontrada");
  return enriquecer(devolucao);
}

export function filaRevisaoManual() {
  return db.data.devolucoes
    .filter((d) => d.status === "pendente")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((d) => enriquecer(d));
}

export function aprovar(id: string) {
  const devolucao = buscarOuFalhar(id);
  devolucao.status = "aprovada_manual";
  aplicarReembolso(devolucao.vendaId);
  db.persist();
  return enriquecer(devolucao);
}

export function rejeitar(id: string) {
  const devolucao = buscarOuFalhar(id);
  devolucao.status = "rejeitada";
  db.persist();
  return enriquecer(devolucao);
}
