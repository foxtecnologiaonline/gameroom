import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DbService, Usuario, Venda } from "../db/db.service";
import { ProdutosService } from "../produtos/produtos.service";

@Injectable()
export class VendasService {
  constructor(private readonly db: DbService, private readonly produtosService: ProdutosService) {}

  private produtoResumo(produtoId: string) {
    const produto = this.db.data.produtos.find((p) => p.id === produtoId);
    return produto ? { id: produto.id, nome: produto.nome } : undefined;
  }

  enriquecerVenda(venda: Venda) {
    const conteudos =
      venda.status === "confirmada"
        ? this.db.data.conteudos
            .filter((c) => c.produtoId === venda.produtoId)
            .sort((a, b) => a.ordem - b.ordem)
            .map((c) => ({ ...c, linkAssinado: c.url }))
        : undefined;
    const comprador = venda.compradorId ? this.db.data.usuarios.find((u) => u.id === venda.compradorId) : undefined;
    return {
      ...venda,
      produto: this.produtoResumo(venda.produtoId),
      comprador: comprador ? { id: comprador.id, nome: comprador.nome, email: comprador.email } : { email: venda.email },
      data: venda.createdAt,
      ...(conteudos ? { conteudos } : {}),
    };
  }

  pertenceAoUsuario(venda: Venda, usuario: Usuario) {
    return venda.compradorId === usuario.id || venda.email === usuario.email;
  }

  async criarCheckout(produtoId: string, emailInformado: string | undefined, usuario: Usuario | null) {
    const produto = this.produtosService.buscarOuFalhar(produtoId);
    if (produto.status !== "ativo") {
      throw new BadRequestException("Produto indisponível para compra");
    }
    const email = usuario?.email || emailInformado;
    if (!email) {
      throw new BadRequestException("Informe um e-mail para continuar a compra");
    }

    const unidade = this.db.data.unidadesEstoque.find(
      (u) => u.produtoId === produtoId && u.status === "disponivel"
    );
    if (!unidade) {
      throw new ConflictException("Produto sem estoque disponível no momento");
    }

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
    this.db.data.vendas.push(venda);
    this.db.persist();
    return this.enriquecerVenda(venda);
  }

  buscarOuFalhar(vendaId: string): Venda {
    const venda = this.db.data.vendas.find((v) => v.id === vendaId);
    if (!venda) throw new NotFoundException("Venda não encontrada");
    return venda;
  }

  obterVenda(vendaId: string) {
    return this.enriquecerVenda(this.buscarOuFalhar(vendaId));
  }

  simularWebhook(vendaId: string, status: "aprovado" | "recusado") {
    const venda = this.buscarOuFalhar(vendaId);
    const unidadeReservada = this.db.data.unidadesEstoque.find(
      (u) => u.vendaId === venda.id && u.status === "reservado"
    );

    if (venda.status === "confirmada" || venda.status === "cancelada") {
      return this.enriquecerVenda(venda);
    }

    if (status === "aprovado") {
      venda.status = "confirmada";
      venda.codigo = venda.id.slice(0, 8).toUpperCase();
      if (unidadeReservada) {
        unidadeReservada.status = "vendido";
        venda.chave = unidadeReservada.codigo;
      }
      const produto = this.db.data.produtos.find((p) => p.id === venda.produtoId);
      if (produto) this.produtosService.reporEstoqueSeNecessario(produto);
    } else {
      venda.status = "cancelada";
      if (unidadeReservada) {
        unidadeReservada.status = "disponivel";
        unidadeReservada.vendaId = undefined;
      }
    }

    this.db.persist();
    return this.enriquecerVenda(venda);
  }

  listarDoUsuario(usuario: Usuario) {
    return this.db.data.vendas
      .filter((v) => this.pertenceAoUsuario(v, usuario))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => this.enriquecerVenda(v));
  }

  obterDoUsuario(vendaId: string, usuario: Usuario) {
    const venda = this.buscarOuFalhar(vendaId);
    if (!this.pertenceAoUsuario(venda, usuario)) {
      throw new NotFoundException("Venda não encontrada");
    }
    return this.enriquecerVenda(venda);
  }

  listarTodas() {
    return this.db.data.vendas
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((v) => this.enriquecerVenda(v));
  }
}
