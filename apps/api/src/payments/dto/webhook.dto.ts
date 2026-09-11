import { IsEnum, IsString } from 'class-validator';
import { PaymentStatus } from '../payment-status.enum';

export class WebhookDto {
  @IsString()
  gatewayId: string;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;
}
