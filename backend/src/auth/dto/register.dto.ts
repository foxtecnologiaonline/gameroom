import { IsEmail, IsString, MinLength } from 'class-validator';

/** Cadastro público — sempre cria usuário tipo "cliente". Criação de admin é um endpoint separado e protegido. */
export class RegisterDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;
}
