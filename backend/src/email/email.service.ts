import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER, EmailProvider } from './email-provider.interface';

export interface ConteudoParaEmail {
  titulo: string;
  tipo: string;
  urlArquivo: string;
}

export interface DadosEmissao {
  destinatario: string;
  produtoNome: string;
  codigo: string | null;
  conteudos: ConteudoParaEmail[];
}

export interface DadosDevolucaoAprovada {
  destinatario: string;
  produtoNome: string;
}

export interface DadosDevolucaoRejeitada {
  destinatario: string;
  produtoNome: string;
  motivo?: string;
}

export interface DadosPedidoCanceladoRevisao {
  destinatario: string;
  pedidoId: string;
}

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  async enviarEmissao(dados: DadosEmissao): Promise<void> {
    const linhasConteudo = dados.conteudos
      .map(
        (c) => `<li>[${c.tipo}] <a href="${c.urlArquivo}">${c.titulo}</a></li>`,
      )
      .join('');

    const html = `
      <h1>Sua compra: ${dados.produtoNome}</h1>
      ${dados.codigo ? `<p>Seu código de acesso: <strong>${dados.codigo}</strong></p>` : ''}
      <p>Materiais de apoio (links válidos por tempo limitado):</p>
      <ul>${linhasConteudo}</ul>
    `;

    await this.provider.enviar({
      para: dados.destinatario,
      assunto: `Sua compra foi confirmada: ${dados.produtoNome}`,
      html,
    });
  }

  async enviarDevolucaoAprovada(dados: DadosDevolucaoAprovada): Promise<void> {
    await this.provider.enviar({
      para: dados.destinatario,
      assunto: `Devolução aprovada: ${dados.produtoNome}`,
      html: `<p>Sua devolução para "${dados.produtoNome}" foi aprovada e o estorno foi solicitado.</p>`,
    });
  }

  async enviarDevolucaoRejeitada(
    dados: DadosDevolucaoRejeitada,
  ): Promise<void> {
    await this.provider.enviar({
      para: dados.destinatario,
      assunto: `Devolução não aprovada: ${dados.produtoNome}`,
      html: `<p>Sua solicitação de devolução para "${dados.produtoNome}" não foi aprovada.${
        dados.motivo ? ` Motivo: ${dados.motivo}` : ''
      }</p>`,
    });
  }

  async enviarPedidoCanceladoRevisao(
    dados: DadosPedidoCanceladoRevisao,
  ): Promise<void> {
    await this.provider.enviar({
      para: dados.destinatario,
      assunto: `Pedido cancelado após revisão de segurança`,
      html: `<p>Seu pedido ${dados.pedidoId} foi cancelado após uma revisão de segurança e o valor será estornado. Se você acredita que isso é um engano, entre em contato com o suporte.</p>`,
    });
  }
}
