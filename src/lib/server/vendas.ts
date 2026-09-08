import { db, type Usuario, type Venda } from "./db";
import { ApiError } from "./auth";
import * as produtosLib from "./produtos";

function produtoResumo(produtoId: string) {
  const produto = db.data.produtos.find((p) => p.id === produtoId);
  return produto ? { id: produto.id, nome: produto.nome } : undefined;
}

export function enriquecerVenda(venda: Venda) {
  const conteudos =
    venda.status === "confirmada"
      ? db.data.conteudos
          .filter((c) => c.produtoId === venda.produtoId)
          .sort((a, b) => a.ordem - b.ordem)
          .map((c) => ({ ...c, linkAssinado: c.url }))
      : undefined;
  const comprador = venda.compradorId ? db.data.usuarios.find((u) => u.id === venda.compradorId) : undefined;
  return {
    ...venda,
    produto: produtoResumo(venda.produtoId),
    comprador: comprador ? { id: comprador.id, nome: comprador.nome, email: comprador.email } : { email: venda.email },
    data: venda.createdAt,
    ...(conteudos ? { conteudos } : {}),
  };
}

export function pertenceAoUsuario(venda: Venda, usuario: Usuario) {
  return venda.compradorId === usuario.id || venda.email === usuario.email;
}

export function criarCheckout(produtoId: string, emailInformado: string | undefined, usuario: Usuario | null) {
  const produto = produtosLib.buscarOuFalhar(produtoId);
  if (produto.status !== "ativo") throw new ApiError(400, "Produto indisponível para compra");
  const email = usuario?.email || emailInformado;
  if (!email) throw new ApiError(400, "Informe um e-mail para continuar a compra");

  const unidade = db.data.unidadesEstoque.find((u) => u.produtoId === produtoId && u.status === "disponivel");
  if (!unidade) throw new ApiError(409, "Produto sem estoque disponível no momento");

  const venda: Venda = {
    id: crypto.randomUUID(),
    produtoId,
    compradorId: usuario?.id,
    email,
    valor: produto.preco,
    status: "aguardando_pagamento",
    createdAt: new Date().toISOString(),
  };
  unidade.status = "reservado";
  unidade.vendaId = venda.id;
  db.data.vendas.push(venda);
  db.persist();
  return enriquecerVenda(venda);
}

export function buscarOuFalhar(vendaId: string): Venda {
  const venda = db.data.vendas.find((v) => v.id === vendaId);
  if (!venda) throw new ApiError(404, "Venda não encontrada");
  return venda;
}

export function obterVenda(vendaId: string) {
  return enriquecerVenda(buscarOuFalhar(vendaId));
}

export function simularWebhook(vendaId: string, status: "aprovado" | "recusado") {
  const venda = buscarOuFalhar(vendaId);
  const unidadeReservada = db.data.unidadesEstoque.find((u) => u.vendaId === venda.id && u.status === "reservado");

  if (venda.status === "confirmada" || venda.status === "cancelada") {
    return enriquecerVenda(venda);
  }

  if (status === "aprovado") {
    venda.status = "confirmada";
    venda.codigo = venda.id.slice(0, 8).toUpperCase();
    if (unidadeReservada) {
      unidadeReservada.status = "vendido";
      venda.chave = unidadeReservada.codigo;
    }
    const produto = db.data.produtos.find((p) => p.id === venda.produtoId);
    if (produto) produtosLib.reporEstoqueSeNecessario(produto);
  } else {
    venda.status = "cancelada";
    if (unidadeReservada) {
      unidadeReservada.status = "disponivel";
      unidadeReservada.vendaId = undefined;
    }
  }

  db.persist();
  return enriquecerVenda(venda);
}

export function listarDoUsuario(usuario: Usuario) {
  return db.data.vendas
    .filter((v) => pertenceAoUsuario(v, usuario))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((v) => enriquecerVenda(v));
}

export function obterDoUsuario(vendaId: string, usuario: Usuario) {
  const venda = buscarOuFalhar(vendaId);
  if (!pertenceAoUsuario(venda, usuario)) throw new ApiError(404, "Venda não encontrada");
  return enriquecerVenda(venda);
}

export function listarTodas() {
  return db.data.vendas.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((v) => enriquecerVenda(v));
}
