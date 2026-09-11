import { IsEnum, IsUUID } from 'class-validator';
import { PaymentMethod } from '../payment-method.enum';

export class ChargeDto {
  @IsUUID()
  orderId: string;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;
}
