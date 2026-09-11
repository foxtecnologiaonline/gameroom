import { IsEnum } from 'class-validator';
import { SubOrderStatus } from '../sub-order-status.enum';

export class UpdateSubOrderStatusDto {
  @IsEnum(SubOrderStatus)
  status: SubOrderStatus;
}
