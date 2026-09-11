import { IsInt, IsString, Matches, Min } from 'class-validator';

export class QuoteDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'destinationZip deve ser um CEP válido',
  })
  destinationZip: string;

  @IsInt()
  @Min(1)
  weightGrams: number;
}
