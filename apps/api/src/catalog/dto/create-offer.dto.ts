import { IsEnum, IsInt, Min } from 'class-validator';
import { OfferCondition } from '../offer-condition.enum';

export class CreateOfferDto {
  @IsInt()
  @Min(1)
  priceCents: number;

  @IsInt()
  @Min(0)
  stock: number;

  @IsEnum(OfferCondition)
  condition: OfferCondition;

  @IsInt()
  @Min(0)
  slaDays: number;
}
