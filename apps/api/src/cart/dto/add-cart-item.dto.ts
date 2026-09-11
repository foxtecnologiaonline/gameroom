import { IsInt, IsUUID, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  offerId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
