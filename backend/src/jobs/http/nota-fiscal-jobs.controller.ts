import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { StatusPedido } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  NOTA_FISCAL_PROVIDER,
  NotaFiscalProvider,
} from '../../nota-fiscal/nota-fiscal-provider.interface';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import { EmitirNotaFiscalJobDto } from '../dto/job-payloads.dto';

/** Corpo é o mesmo do antigo NotaFiscalProcessor.process(). */
@Controller('jobs/nota-fiscal')
@UseGuards(QstashSignatureGuard)
export class NotaFiscalJobsController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTA_FISCAL_PROVIDER)
    private readonly notaFiscalProvider: NotaFiscalProvider,
  ) {}

  @Post('emitir-nota-fiscal')
  @HttpCode(200)
  async emitirNotaFiscal(@Body() dto: EmitirNotaFiscalJobDto): Promise<void> {
    const pedido = await this.prisma.pedido.findUnique({
      where: { id: dto.pedidoId },
    });
    if (!pedido) {
      return;
    }
    if (pedido.notaFiscalId) {
      // Idempotente: reentrega não emite uma segunda nota.
      return;
    }
    if (pedido.status !== StatusPedido.confirmado) {
      return;
    }

    const { notaFiscalId } = await this.notaFiscalProvider.emitir({
      pedidoId: pedido.id,
      valor: Number(pedido.valorTotal),
      compradorEmail: pedido.compradorEmail,
    });

    await this.prisma.pedido.update({
      where: { id: dto.pedidoId },
      data: { notaFiscalId },
    });
  }
}
