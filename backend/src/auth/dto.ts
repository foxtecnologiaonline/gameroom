import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class RegisterDto {
  @IsString()
  @MinLength(2, { message: "Informe seu nome completo" })
  nome: string;

  @IsEmail({}, { message: "E-mail inválido" })
  email: string;

  @IsString()
  @MinLength(6, { message: "A senha deve ter ao menos 6 caracteres" })
  senha: string;

  @IsOptional()
  @IsIn(["cliente", "admin"])
  tipo?: string;
}

export class LoginDto {
  @IsEmail({}, { message: "E-mail inválido" })
  email: string;

  @IsString()
  @MinLength(1, { message: "Informe a senha" })
  senha: string;
}
