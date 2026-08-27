import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StatusDevolucao } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  REFUND_GATEWAY,
  RefundGateway,
} from '../../refund/refund-gateway.interface';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import { ProcessarDevolucaoJobDto } from '../dto/job-payloads.dto';

/** Corpo é o mesmo do antigo DevolucaoProcessor.process(). */
@Controller('jobs/devolucoes')
@UseGuards(QstashSignatureGuard)
export class DevolucaoJobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(REFUND_GATEWAY) private readonly refundGateway: RefundGateway,
  ) {}

  @Post('processar-devolucao')
  @HttpCode(200)
  async processarDevolucao(
    @Body() dto: ProcessarDevolucaoJobDto,
  ): Promise<void> {
    const devolucao = await this.prisma.devolucao.findUnique({
      where: { id: dto.devolucaoId },
      include: { itemPedido: { include: { pedido: true, produto: true } } },
    });
    if (!devolucao) {
      return;
    }
    if (devolucao.processadoEm) {
      // Idempotente: reentrega não solicita um segundo estorno.
      return;
    }
    if (
      devolucao.status !== StatusDevolucao.aprovada_automatica &&
      devolucao.status !== StatusDevolucao.aprovada_manual
    ) {
      return;
    }

    const { estornoId } = await this.refundGateway.estornar({
      transacaoOriginalId:
        devolucao.itemPedido.pedido.gatewayTransacaoId ??
        devolucao.itemPedido.pedido.id,
      valor: Number(devolucao.itemPedido.valorUnitario),
      motivo: devolucao.motivo ?? undefined,
    });

    await this.prisma.devolucao.update({
      where: { id: devolucao.id },
      data: { estornoGatewayId: estornoId, processadoEm: new Date() },
    });

    await this.emailService.enviarDevolucaoAprovada({
      destinatario: devolucao.itemPedido.pedido.compradorEmail,
      produtoNome: devolucao.itemPedido.produto.nome,
    });
  }
}
