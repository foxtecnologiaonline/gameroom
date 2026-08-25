import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PagamentoService } from './pagamento.service';
import { WebhookPagamentoDto } from './dto/webhook-pagamento.dto';
import { SimularPagamentoDto } from './dto/simular-pagamento.dto';
import { verificarAssinaturaWebhook } from './webhook-signature.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('webhooks/pagamento')
export class PagamentoController {
  constructor(
    private readonly pagamentoService: PagamentoService,
    private readonly config: ConfigService,
  ) {}

  @Post()
  @HttpCode(200)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async receberWebhook(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers('x-webhook-signature') assinatura: string,
    @Body() dto: WebhookPagamentoDto,
  ) {
    const segredo = this.config.get<string>('PAGAMENTO_WEBHOOK_SECRET')!;
    const rawBody = request.rawBody ?? Buffer.from(JSON.stringify(dto));

    if (!verificarAssinaturaWebhook(rawBody, assinatura, segredo)) {
      throw new ForbiddenException('Assinatura do webhook inválida');
    }

    await this.pagamentoService.processarWebhook(dto);
    return { recebido: true };
  }

  /**
   * Simula a confirmação de pagamento sem precisar de um gateway real
   * integrado — só para uso administrativo (dev/demo/homologação). A
   * autenticação de admin substitui a assinatura HMAC do webhook real.
   */
  @Post('simular/:pedidoId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async simular(
    @Param('pedidoId', ParseUUIDPipe) pedidoId: string,
    @Body() dto: SimularPagamentoDto,
  ) {
    await this.pagamentoService.processarWebhook({
      pedidoId,
      transacaoId: `sim_${pedidoId}_${Date.now()}`,
      status: dto.status,
    });
    return { simulado: true };
  }
}
