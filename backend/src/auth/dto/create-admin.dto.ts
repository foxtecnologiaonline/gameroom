import { IsEmail, IsString, MinLength } from 'class-validator';

/** Só pode ser chamado por um admin autenticado — ver AuthController. */
export class CreateAdminDto {
  @IsString()
  @MinLength(2)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  senha!: string;
}
