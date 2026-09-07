import { IsString, MinLength } from "class-validator";

export class CreateDevolucaoDto {
  @IsString()
  vendaId: string;

  @IsString()
  @MinLength(10, { message: "Descreva o motivo com pelo menos 10 caracteres" })
  motivo: string;
}
