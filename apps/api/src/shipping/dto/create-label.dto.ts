import { IsInt, IsString, IsUUID, Matches, Min } from 'class-validator';

export class CreateLabelDto {
  @IsUUID()
  subOrderId: string;

  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, {
    message: 'destinationZip deve ser um CEP válido',
  })
  destinationZip: string;

  @IsInt()
  @Min(1)
  weightGrams: number;

  @IsString()
  carrier: string;
}
