import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { ChargeDto } from './dto/charge.dto';
import { WebhookDto } from './dto/webhook.dto';
import { PaymentEntity } from './entities/payment.entity';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('charge')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(IdempotencyInterceptor)
  charge(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChargeDto,
  ): Promise<PaymentEntity> {
    return this.payments.charge(user.id, dto);
  }

  /**
   * Called by the gateway, not by an authenticated user — no JwtAuthGuard.
   * Idempotent via PaymentsService's own status comparison, not the
   * Idempotency-Key header contract (the gateway doesn't send one).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Body() dto: WebhookDto): Promise<PaymentEntity> {
    return this.payments.handleWebhook(dto);
  }
}
