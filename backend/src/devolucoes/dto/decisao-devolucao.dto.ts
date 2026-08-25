import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class DecisaoDevolucaoDto {
  @IsBoolean()
  aprovar!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivoRejeicao?: string;
}
