import { IsEnum } from 'class-validator';
import { SellerStatus } from '../seller-status.enum';

export class UpdateSellerStatusDto {
  @IsEnum(SellerStatus)
  status: SellerStatus;
}
