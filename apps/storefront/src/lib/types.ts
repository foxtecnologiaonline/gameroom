export type TipoUsuario = "cliente" | "admin";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
}

export interface AuthResponse {
  access_token: string;
  usuario: Usuario;
}

export type StatusProduto = "ativo" | "inativo" | "rascunho";

export interface ConteudoProduto {
  id: string;
  tipo: string;
  titulo: string;
  ordem: number;
  url?: string;
  linkAssinado?: string;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  categoria: string;
  status: StatusProduto;
  estoqueLotePadrao?: number;
  limiarReabastecimento?: number;
  imagemUrl?: string;
  conteudos?: ConteudoProduto[];
  createdAt?: string;
}

export type StatusVenda =
  | "pendente"
  | "aguardando_pagamento"
  | "confirmada"
  | "cancelada"
  | "reembolsada";

export interface Venda {
  id: string;
  produtoId: string;
  produto?: Produto | { id: string; nome: string };
  comprador?: { id?: string; nome?: string; email: string };
  email?: string;
  valor: number;
  status: StatusVenda;
  checkoutUrl?: string;
  codigo?: string;
  chave?: string;
  data?: string;
  createdAt?: string;
  conteudos?: ConteudoProduto[];
}

export type StatusDevolucao =
  | "pendente"
  | "aprovada_automatica"
  | "aprovada_manual"
  | "rejeitada";

export interface Devolucao {
  id: string;
  vendaId: string;
  venda?: Venda;
  motivo: string;
  status: StatusDevolucao;
  createdAt?: string;
  data?: string;
}

export type StatusUnidadeEstoque =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "devolvido"
  | "bloqueado";

export interface UnidadeEstoque {
  id: string;
  produtoId: string;
  status: StatusUnidadeEstoque;
  codigo?: string;
  createdAt?: string;
}

export interface ResumoEstoque {
  disponivel: number;
  reservado: number;
  vendido: number;
  devolvido: number;
  bloqueado: number;
}

export interface Reabastecimento {
  id: string;
  produtoId: string;
  produto?: { id: string; nome: string };
  quantidadeGerada: number;
  estoqueAntes: number;
  createdAt?: string;
  data?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
}
