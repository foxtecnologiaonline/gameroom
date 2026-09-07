import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Min, MinLength } from "class-validator";

export class CreateProdutoDto {
  @IsString()
  @MinLength(2, { message: "Informe o nome do produto" })
  nome: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsNumber()
  @IsPositive({ message: "O preço deve ser maior que zero" })
  preco: number;

  @IsString()
  @MinLength(1, { message: "Informe a categoria" })
  categoria: string;

  @IsIn(["ativo", "inativo", "rascunho"])
  status: "ativo" | "inativo" | "rascunho";

  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueLotePadrao?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiarReabastecimento?: number;

  @IsOptional()
  @IsUrl({}, { message: "Informe uma URL válida" })
  imagemUrl?: string;
}

export class UpdateProdutoDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: "Informe o nome do produto" })
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: "O preço deve ser maior que zero" })
  preco?: number;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: "Informe a categoria" })
  categoria?: string;

  @IsOptional()
  @IsIn(["ativo", "inativo", "rascunho"])
  status?: "ativo" | "inativo" | "rascunho";

  @IsOptional()
  @IsInt()
  @Min(0)
  estoqueLotePadrao?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  limiarReabastecimento?: number;

  @IsOptional()
  @IsUrl({}, { message: "Informe uma URL válida" })
  imagemUrl?: string;
}
