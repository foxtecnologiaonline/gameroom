import { Injectable, OnModuleInit } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import * as bcrypt from "bcryptjs";

export type TipoUsuario = "cliente" | "admin";
export type StatusProduto = "ativo" | "inativo" | "rascunho";
export type StatusVenda = "pendente" | "aguardando_pagamento" | "confirmada" | "cancelada" | "reembolsada";
export type StatusDevolucao = "pendente" | "aprovada_automatica" | "aprovada_manual" | "rejeitada";
export type StatusUnidadeEstoque = "disponivel" | "reservado" | "vendido" | "devolvido" | "bloqueado";
export type ResumoEstoque = Record<StatusUnidadeEstoque, number>;

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senhaHash: string;
  tipo: TipoUsuario;
  createdAt: string;
}

export interface ConteudoProduto {
  id: string;
  produtoId: string;
  tipo: string;
  titulo: string;
  ordem: number;
  url?: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  categoria: string;
  status: StatusProduto;
  estoqueLotePadrao: number;
  limiarReabastecimento: number;
  imagemUrl?: string;
  createdAt: string;
}

export interface UnidadeEstoque {
  id: string;
  produtoId: string;
  status: StatusUnidadeEstoque;
  codigo?: string;
  vendaId?: string;
  createdAt: string;
}

export interface Venda {
  id: string;
  produtoId: string;
  compradorId?: string;
  email: string;
  valor: number;
  status: StatusVenda;
  checkoutUrl?: string;
  codigo?: string;
  chave?: string;
  createdAt: string;
}

export interface Devolucao {
  id: string;
  vendaId: string;
  motivo: string;
  status: StatusDevolucao;
  createdAt: string;
}

export interface Reabastecimento {
  id: string;
  produtoId: string;
  quantidadeGerada: number;
  estoqueAntes: number;
  createdAt: string;
}

interface DbShape {
  usuarios: Usuario[];
  produtos: Produto[];
  conteudos: ConteudoProduto[];
  unidadesEstoque: UnidadeEstoque[];
  vendas: Venda[];
  devolucoes: Devolucao[];
  reabastecimentos: Reabastecimento[];
}

const DB_PATH = path.join(__dirname, "..", "..", "data", "db.json");

@Injectable()
export class DbService implements OnModuleInit {
  data: DbShape = {
    usuarios: [],
    produtos: [],
    conteudos: [],
    unidadesEstoque: [],
    vendas: [],
    devolucoes: [],
    reabastecimentos: [],
  };

  onModuleInit() {
    this.load();
    if (this.data.usuarios.length === 0 && this.data.produtos.length === 0) {
      this.seed();
      this.persist();
    }
  }

  private load() {
    if (fs.existsSync(DB_PATH)) {
      try {
        this.data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      } catch {
        // arquivo corrompido: mantém estado vazio em memória, será recriado no próximo persist()
      }
    }
  }

  persist() {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(this.data, null, 2));
  }

  private seed() {
    const agora = new Date().toISOString();
    const senhaAdminHash = bcrypt.hashSync("admin123", 10);
    const senhaClienteHash = bcrypt.hashSync("cliente123", 10);

    this.data.usuarios.push(
      {
        id: crypto.randomUUID(),
        nome: "Administrador",
        email: "admin@gameroom.dev",
        senhaHash: senhaAdminHash,
        tipo: "admin",
        createdAt: agora,
      },
      {
        id: crypto.randomUUID(),
        nome: "Cliente Demo",
        email: "cliente@gameroom.dev",
        senhaHash: senhaClienteHash,
        tipo: "cliente",
        createdAt: agora,
      }
    );

    const produtosSeed: Array<Omit<Produto, "id" | "createdAt">> = [
      {
        nome: "Gift Card Steam R$ 50",
        descricao: "Crédito de R$ 50 para usar na loja Steam. Entrega automática do código após a confirmação do pagamento.",
        preco: 50,
        categoria: "Gift Card",
        status: "ativo",
        estoqueLotePadrao: 15,
        limiarReabastecimento: 3,
        imagemUrl: undefined,
      },
      {
        nome: "Chave Elden Ring (PC)",
        descricao: "Chave original para ativação na Steam. Código enviado por e-mail e disponível na área do cliente.",
        preco: 149.9,
        categoria: "Chave de Jogo",
        status: "ativo",
        estoqueLotePadrao: 10,
        limiarReabastecimento: 2,
        imagemUrl: undefined,
      },
      {
        nome: "Assinatura Xbox Game Pass Ultimate (1 mês)",
        descricao: "Código de 1 mês do Game Pass Ultimate, válido para novas contas.",
        preco: 44.9,
        categoria: "Assinatura",
        status: "ativo",
        estoqueLotePadrao: 20,
        limiarReabastecimento: 5,
        imagemUrl: undefined,
      },
    ];

    for (const p of produtosSeed) {
      const produtoId = crypto.randomUUID();
      this.data.produtos.push({ ...p, id: produtoId, createdAt: agora });
      const quantidade = p.estoqueLotePadrao;
      for (let i = 0; i < quantidade; i++) {
        this.data.unidadesEstoque.push({
          id: crypto.randomUUID(),
          produtoId,
          status: "disponivel",
          codigo: gerarCodigo(),
          createdAt: agora,
        });
      }
      this.data.reabastecimentos.push({
        id: crypto.randomUUID(),
        produtoId,
        quantidadeGerada: quantidade,
        estoqueAntes: 0,
        createdAt: agora,
      });
    }
  }
}

export function gerarCodigo(): string {
  const grupos = Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 6).toUpperCase()
  );
  return grupos.join("-");
}
