export type TipoEstoque = 'serializado' | 'sob_demanda';
export type StatusProduto = 'rascunho' | 'ativo' | 'inativo';
export type StatusUnidade = 'aguardando_codigo' | 'disponivel' | 'reservado' | 'vendido' | 'devolvido' | 'bloqueado';
export type StatusPedido = 'pendente' | 'confirmado' | 'cancelado' | 'estornado';
export type StatusDevolucao = 'pendente' | 'aprovada_automatica' | 'aprovada_manual' | 'rejeitada';
export type StatusRetencaoFraude = 'pendente' | 'liberada' | 'bloqueada';
export type TipoConteudo = 'manual' | 'cartilha' | 'video';

export interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: string;
  categoria: string | null;
  status: StatusProduto;
  tipoEstoque: TipoEstoque;
  estoqueLotePadrao: number;
  limiarReabastecimento: number;
  criadoEm: string;
  atualizadoEm: string;
  conteudos?: ConteudoProduto[];
}

export interface ConteudoProduto {
  id: string;
  produtoId: string;
  tipo: TipoConteudo;
  titulo: string;
  urlArquivo: string;
  ordem: number;
}

export interface UnidadeEstoque {
  id: string;
  status: StatusUnidade;
  criadoEm: string;
  atualizadoEm: string;
  codigoHash: string | null;
  temCodigo: boolean;
}

export interface ItemPedido {
  id: string;
  pedidoId: string;
  produtoId: string;
  unidadeId: string | null;
  valorUnitario: string;
  reservadoAte: string | null;
  emitidoEm: string | null;
  criadoEm: string;
  produto: Produto;
  pedido?: Pedido;
  devolucoes?: Devolucao[];
}

export interface Pedido {
  id: string;
  compradorEmail: string;
  status: StatusPedido;
  valorTotal: string;
  gatewayTransacaoId: string | null;
  notaFiscalId: string | null;
  criadoEm: string;
  confirmadoEm: string | null;
  itens: ItemPedido[];
}

export interface Devolucao {
  id: string;
  itemPedidoId: string;
  motivo: string | null;
  status: StatusDevolucao;
  estornoGatewayId: string | null;
  criadoEm: string;
  processadoEm: string | null;
  itemPedido?: ItemPedido;
}

export interface RetencaoFraude {
  id: string;
  pedidoId: string;
  motivo: string;
  status: StatusRetencaoFraude;
  criadoEm: string;
  decididoEm: string | null;
  pedido?: Pedido;
}

export interface LogReabastecimento {
  id: string;
  produtoId: string;
  quantidadeGerada: number;
  motivo: 'automatico_limiar' | 'manual';
  criadoEm: string;
  produto: { id: string; nome: string };
}

export interface LogAuditoria {
  id: string;
  usuarioId: string | null;
  acao: string;
  entidade: string;
  entidadeId: string;
  criadoEm: string;
  usuario: { id: string; nome: string; email: string } | null;
}

export interface Paginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
  totalPaginas: number;
}
