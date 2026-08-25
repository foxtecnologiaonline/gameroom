import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AtualizarProdutoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  preco?: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsIn(['rascunho', 'ativo', 'inativo'])
  status?: 'rascunho' | 'ativo' | 'inativo';

  @IsOptional()
  @IsInt()
  @Min(0)
  limiarReabastecimento?: number;
}
