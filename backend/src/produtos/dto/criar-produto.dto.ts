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

export class CriarProdutoDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNumber()
  @IsPositive()
  preco!: number;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsIn(['serializado', 'sob_demanda'])
  tipoEstoque?: 'serializado' | 'sob_demanda';

  @IsOptional()
  @IsInt()
  @IsPositive()
  estoqueLotePadrao?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiarReabastecimento?: number;
}
