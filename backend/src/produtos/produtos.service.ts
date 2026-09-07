import { Injectable, NotFoundException } from "@nestjs/common";
import { DbService, Produto } from "../db/db.service";
import { gerarCodigo } from "../db/db.service";
import { CreateProdutoDto, UpdateProdutoDto } from "./dto";

const PADRAO_LOTE = 10;
const PADRAO_LIMIAR = 2;

@Injectable()
export class ProdutosService {
  constructor(private readonly db: DbService) {}

  private comConteudos(produto: Produto, revelarUrl: boolean) {
    const conteudos = this.db.data.conteudos
      .filter((c) => c.produtoId === produto.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => (revelarUrl ? c : { id: c.id, tipo: c.tipo, titulo: c.titulo, ordem: c.ordem }));
    return { ...produto, conteudos };
  }

  listarAtivos() {
    return this.db.data.produtos
      .filter((p) => p.status === "ativo")
      .map((p) => this.comConteudos(p, false));
  }

  listarTodos() {
    return this.db.data.produtos.map((p) => this.comConteudos(p, true));
  }

  buscarOuFalhar(id: string): Produto {
    const produto = this.db.data.produtos.find((p) => p.id === id);
    if (!produto) throw new NotFoundException("Produto não encontrado");
    return produto;
  }

  obterDetalhe(id: string, revelarUrl: boolean) {
    return this.comConteudos(this.buscarOuFalhar(id), revelarUrl);
  }

  criar(dto: CreateProdutoDto) {
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
    this.db.data.produtos.push(produto);
    this.gerarUnidades(produto.id, estoqueLotePadrao, 0);
    this.db.persist();
    return this.comConteudos(produto, true);
  }

  atualizar(id: string, dto: UpdateProdutoDto) {
    const produto = this.buscarOuFalhar(id);
    Object.assign(produto, {
      ...dto,
      imagemUrl: dto.imagemUrl === "" ? undefined : dto.imagemUrl ?? produto.imagemUrl,
    });
    this.db.persist();
    return this.comConteudos(produto, true);
  }

  adicionarConteudo(produtoId: string, tipo: string, titulo: string, ordem: number, url: string) {
    this.buscarOuFalhar(produtoId);
    const conteudo = { id: crypto.randomUUID(), produtoId, tipo, titulo, ordem, url };
    this.db.data.conteudos.push(conteudo);
    this.db.persist();
    return conteudo;
  }

  /** Gera novas unidades de estoque e registra o reabastecimento no histórico. */
  gerarUnidades(produtoId: string, quantidade: number, estoqueAntes: number) {
    const agora = new Date().toISOString();
    for (let i = 0; i < quantidade; i++) {
      this.db.data.unidadesEstoque.push({
        id: crypto.randomUUID(),
        produtoId,
        status: "disponivel",
        codigo: gerarCodigo(),
        createdAt: agora,
      });
    }
    this.db.data.reabastecimentos.push({
      id: crypto.randomUUID(),
      produtoId,
      quantidadeGerada: quantidade,
      estoqueAntes,
      createdAt: agora,
    });
  }

  /** Repõe estoque automaticamente quando a quantidade disponível cai no ou abaixo do limiar. */
  reporEstoqueSeNecessario(produto: Produto) {
    const disponiveis = this.db.data.unidadesEstoque.filter(
      (u) => u.produtoId === produto.id && u.status === "disponivel"
    ).length;
    if (disponiveis <= produto.limiarReabastecimento) {
      this.gerarUnidades(produto.id, produto.estoqueLotePadrao, disponiveis);
    }
  }
}
