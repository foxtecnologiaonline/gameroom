import { IsUUID } from 'class-validator';

export class ReleaseStockDto {
  @IsUUID()
  reservationId: string;
}
