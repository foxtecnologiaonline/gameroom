import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DbService, Devolucao, Usuario } from "../db/db.service";
import { VendasService } from "../vendas/vendas.service";

const JANELA_APROVACAO_AUTOMATICA_HORAS = 24;

@Injectable()
export class DevolucoesService {
  constructor(private readonly db: DbService, private readonly vendasService: VendasService) {}

  private enriquecer(devolucao: Devolucao) {
    return { ...devolucao, data: devolucao.createdAt };
  }

  private aplicarReembolso(vendaId: string) {
    const venda = this.vendasService.buscarOuFalhar(vendaId);
    venda.status = "reembolsada";
    const unidade = this.db.data.unidadesEstoque.find((u) => u.vendaId === venda.id && u.status === "vendido");
    if (unidade) unidade.status = "devolvido";
  }

  criar(vendaId: string, motivo: string, usuario: Usuario) {
    const venda = this.vendasService.obterDoUsuario(vendaId, usuario);
    if (venda.status !== "confirmada") {
      throw new BadRequestException("Só é possível solicitar devolução de uma compra confirmada");
    }
    if (this.db.data.devolucoes.some((d) => d.vendaId === vendaId)) {
      throw new BadRequestException("Já existe uma solicitação de devolução para essa compra");
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
    this.db.data.devolucoes.push(devolucao);
    if (aprovadaAutomaticamente) this.aplicarReembolso(vendaId);
    this.db.persist();
    return this.enriquecer(devolucao);
  }

  buscarOuFalhar(id: string): Devolucao {
    const devolucao = this.db.data.devolucoes.find((d) => d.id === id);
    if (!devolucao) throw new NotFoundException("Devolução não encontrada");
    return devolucao;
  }

  obterDoUsuario(id: string, usuario: Usuario) {
    const devolucao = this.buscarOuFalhar(id);
    const venda = this.vendasService.buscarOuFalhar(devolucao.vendaId);
    if (!this.vendasService.pertenceAoUsuario(venda, usuario)) {
      throw new NotFoundException("Devolução não encontrada");
    }
    return this.enriquecer(devolucao);
  }

  filaRevisaoManual() {
    return this.db.data.devolucoes
      .filter((d) => d.status === "pendente")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((d) => this.enriquecer(d));
  }

  aprovar(id: string) {
    const devolucao = this.buscarOuFalhar(id);
    devolucao.status = "aprovada_manual";
    this.aplicarReembolso(devolucao.vendaId);
    this.db.persist();
    return this.enriquecer(devolucao);
  }

  rejeitar(id: string) {
    const devolucao = this.buscarOuFalhar(id);
    devolucao.status = "rejeitada";
    this.db.persist();
    return this.enriquecer(devolucao);
  }
}
