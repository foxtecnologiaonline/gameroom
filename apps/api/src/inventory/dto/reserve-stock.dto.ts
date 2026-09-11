import { IsInt, Min } from 'class-validator';

export class ReserveStockDto {
  @IsInt()
  @Min(1)
  quantity: number;
}
