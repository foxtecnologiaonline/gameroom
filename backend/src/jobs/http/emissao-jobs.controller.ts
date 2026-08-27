import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/crypto/encryption.service';
import { EstoqueService } from '../../estoque/estoque.service';
import { ConteudoService } from '../../conteudo/conteudo.service';
import { EmailService } from '../../email/email.service';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import { EmitirEEntregarJobDto } from '../dto/job-payloads.dto';

/** Corpo é o mesmo do antigo EmissaoProcessor.process(). */
@Controller('jobs/emissao')
@UseGuards(QstashSignatureGuard)
export class EmissaoJobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly estoqueService: EstoqueService,
    private readonly conteudoService: ConteudoService,
    private readonly emailService: EmailService,
    private readonly encryption: EncryptionService,
  ) {}

  @Post('emitir-e-entregar')
  @HttpCode(200)
  async emitirEEntregar(@Body() dto: EmitirEEntregarJobDto): Promise<void> {
    const item = await this.prisma.itemPedido.findUnique({
      where: { id: dto.itemPedidoId },
      include: { pedido: true, produto: { include: { conteudos: true } } },
    });
    if (!item) {
      // Nada a fazer — não relança (relançar faria o QStash tentar de novo à toa).
      return;
    }
    if (item.emitidoEm) {
      // Idempotente: reentrega (retry ou webhook duplicado) não reenvia e-mail.
      return;
    }
    if (item.pedido.status !== StatusPedido.confirmado) {
      // Pedido ainda não confirmado — lança pra o QStash tentar de novo.
      throw new Error('Pedido ainda não confirmado');
    }

    const codigo = await this.obterOuGerarCodigo(item);
    const conteudosComUrl = await this.conteudoService.comUrlAssinada(
      item.produto.conteudos,
    );

    await this.emailService.enviarEmissao({
      destinatario: item.pedido.compradorEmail,
      produtoNome: item.produto.nome,
      codigo,
      conteudos: conteudosComUrl,
    });

    await this.prisma.itemPedido.update({
      where: { id: item.id },
      data: { emitidoEm: new Date() },
    });
  }

  private async obterOuGerarCodigo(item: {
    id: string;
    unidadeId: string | null;
    produto: { tipoEstoque: string };
  }): Promise<string | null> {
    if (item.produto.tipoEstoque === 'serializado') {
      return item.unidadeId
        ? this.estoqueService.obterCodigoDecifrado(item.unidadeId)
        : null;
    }

    // sob_demanda: gera um token de acesso on-the-fly.
    // Ponto de integração para um fornecedor real de chaves/licenças (ver §12 da especificação v2).
    const token = randomUUID();
    await this.prisma.itemPedido.update({
      where: { id: item.id },
      data: {
        codigoSobDemandaCifrado: Uint8Array.from(
          this.encryption.encrypt(token),
        ),
      },
    });
    return token;
  }
}
