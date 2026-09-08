import { db, gerarCodigo, type Produto } from "./db";
import { ApiError } from "./auth";

const PADRAO_LOTE = 10;
const PADRAO_LIMIAR = 2;

function comConteudos(produto: Produto, revelarUrl: boolean) {
  const conteudos = db.data.conteudos
    .filter((c) => c.produtoId === produto.id)
    .sort((a, b) => a.ordem - b.ordem)
    .map((c) => (revelarUrl ? c : { id: c.id, tipo: c.tipo, titulo: c.titulo, ordem: c.ordem }));
  return { ...produto, conteudos };
}

export function listarAtivos() {
  return db.data.produtos.filter((p) => p.status === "ativo").map((p) => comConteudos(p, false));
}

export function listarTodos() {
  return db.data.produtos.map((p) => comConteudos(p, true));
}

export function buscarOuFalhar(id: string): Produto {
  const produto = db.data.produtos.find((p) => p.id === id);
  if (!produto) throw new ApiError(404, "Produto não encontrado");
  return produto;
}

export function obterDetalhe(id: string, revelarUrl: boolean) {
  return comConteudos(buscarOuFalhar(id), revelarUrl);
}

interface ProdutoInput {
  nome: string;
  descricao?: string;
  preco: number;
  categoria: string;
  status: "ativo" | "inativo" | "rascunho";
  estoqueLotePadrao?: number;
  limiarReabastecimento?: number;
  imagemUrl?: string;
}

function validarProdutoInput(dto: Partial<ProdutoInput>, exigirCampos: boolean) {
  if (exigirCampos || dto.nome !== undefined) {
    if (!dto.nome || dto.nome.trim().length < 2) throw new ApiError(400, "Informe o nome do produto");
  }
  if (exigirCampos || dto.preco !== undefined) {
    if (typeof dto.preco !== "number" || dto.preco <= 0) throw new ApiError(400, "O preço deve ser maior que zero");
  }
  if (exigirCampos || dto.categoria !== undefined) {
    if (!dto.categoria || dto.categoria.trim().length < 1) throw new ApiError(400, "Informe a categoria");
  }
  if (exigirCampos || dto.status !== undefined) {
    if (!["ativo", "inativo", "rascunho"].includes(dto.status as string)) {
      throw new ApiError(400, "Status inválido");
    }
  }
}

export function criar(dto: ProdutoInput) {
  validarProdutoInput(dto, true);
  const agora = new Date().toISOString();
  const estoqueLotePadrao = dto.estoqueLotePadrao ?? PADRAO_LOTE;
  const limiarReabastecimento = dto.limiarReabastecimento ?? PADRAO_LIMIAR;
  const produto: Produto = {
    id: crypto.randomUUID(),
    nome: dto.nome,
    descricao: dto.descricao,
    preco: dto.preco,
    categoria: dto.categoria,
    status: dto.status,
    estoqueLotePadrao,
    limiarReabastecimento,
    imagemUrl: dto.imagemUrl || undefined,
    createdAt: agora,
  };
  db.data.produtos.push(produto);
  gerarUnidades(produto.id, estoqueLotePadrao, 0);
  db.persist();
  return comConteudos(produto, true);
}

export function atualizar(id: string, dto: Partial<ProdutoInput>) {
  validarProdutoInput(dto, false);
  const produto = buscarOuFalhar(id);
  Object.assign(produto, {
    ...dto,
    imagemUrl: dto.imagemUrl === "" ? undefined : dto.imagemUrl ?? produto.imagemUrl,
  });
  db.persist();
  return comConteudos(produto, true);
}

export function adicionarConteudo(produtoId: string, tipo: string, titulo: string, ordem: number, url: string) {
  buscarOuFalhar(produtoId);
  const conteudo = { id: crypto.randomUUID(), produtoId, tipo, titulo, ordem, url };
  db.data.conteudos.push(conteudo);
  db.persist();
  return conteudo;
}

export function gerarUnidades(produtoId: string, quantidade: number, estoqueAntes: number) {
  const agora = new Date().toISOString();
  for (let i = 0; i < quantidade; i++) {
    db.data.unidadesEstoque.push({
      id: crypto.randomUUID(),
      produtoId,
      status: "disponivel",
      codigo: gerarCodigo(),
      createdAt: agora,
    });
  }
  db.data.reabastecimentos.push({
    id: crypto.randomUUID(),
    produtoId,
    quantidadeGerada: quantidade,
    estoqueAntes,
    createdAt: agora,
  });
}

export function reporEstoqueSeNecessario(produto: Produto) {
  const disponiveis = db.data.unidadesEstoque.filter(
    (u) => u.produtoId === produto.id && u.status === "disponivel"
  ).length;
  if (disponiveis <= produto.limiarReabastecimento) {
    gerarUnidades(produto.id, produto.estoqueLotePadrao, disponiveis);
  }
}
