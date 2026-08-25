import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { PagamentoService } from './pagamento.service';
import { WebhookPagamentoDto } from './dto/webhook-pagamento.dto';
import { verificarAssinaturaWebhook } from './webhook-signature.util';

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
}
