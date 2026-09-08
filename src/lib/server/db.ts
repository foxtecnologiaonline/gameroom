import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

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

// Em runtime serverless (Vercel) o único diretório com permissão de escrita é /tmp,
// e ele é efêmero por instância — os dados sobrevivem enquanto a função ficar "quente".
// Isso é uma escolha deliberada para o MVP: ver DECISOES.md / README sobre trocar por
// um banco real antes de qualquer uso com tráfego de verdade.
const DB_PATH = process.env.VERCEL
  ? "/tmp/gameroom-db.json"
  : path.join(process.cwd(), ".data", "db.json");

let cache: DbShape | null = null;

function vazio(): DbShape {
  return { usuarios: [], produtos: [], conteudos: [], unidadesEstoque: [], vendas: [], devolucoes: [], reabastecimentos: [] };
}

function gerarCodigo(): string {
  const grupos = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 6).toUpperCase());
  return grupos.join("-");
}

function seed(data: DbShape) {
  const agora = new Date().toISOString();
  data.usuarios.push(
    {
      id: crypto.randomUUID(),
      nome: "Administrador",
      email: "admin@gameroom.dev",
      senhaHash: bcrypt.hashSync("admin123", 10),
      tipo: "admin",
      createdAt: agora,
    },
    {
      id: crypto.randomUUID(),
      nome: "Cliente Demo",
      email: "cliente@gameroom.dev",
      senhaHash: bcrypt.hashSync("cliente123", 10),
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
    },
    {
      nome: "Chave Elden Ring (PC)",
      descricao: "Chave original para ativação na Steam. Código enviado por e-mail e disponível na área do cliente.",
      preco: 149.9,
      categoria: "Chave de Jogo",
      status: "ativo",
      estoqueLotePadrao: 10,
      limiarReabastecimento: 2,
    },
    {
      nome: "Assinatura Xbox Game Pass Ultimate (1 mês)",
      descricao: "Código de 1 mês do Game Pass Ultimate, válido para novas contas.",
      preco: 44.9,
      categoria: "Assinatura",
      status: "ativo",
      estoqueLotePadrao: 20,
      limiarReabastecimento: 5,
    },
  ];

  for (const p of produtosSeed) {
    const produtoId = crypto.randomUUID();
    data.produtos.push({ ...p, id: produtoId, createdAt: agora });
    for (let i = 0; i < p.estoqueLotePadrao; i++) {
      data.unidadesEstoque.push({
        id: crypto.randomUUID(),
        produtoId,
        status: "disponivel",
        codigo: gerarCodigo(),
        createdAt: agora,
      });
    }
    data.reabastecimentos.push({
      id: crypto.randomUUID(),
      produtoId,
      quantidadeGerada: p.estoqueLotePadrao,
      estoqueAntes: 0,
      createdAt: agora,
    });
  }
}

function load(): DbShape {
  if (cache) return cache;
  let data: DbShape = vazio();
  if (fs.existsSync(DB_PATH)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
    } catch {
      data = vazio();
    }
  }
  if (data.usuarios.length === 0 && data.produtos.length === 0) {
    seed(data);
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  }
  cache = data;
  return data;
}

export const db = {
  get data(): DbShape {
    return load();
  },
  persist() {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(load(), null, 2));
  },
};

export { gerarCodigo };
