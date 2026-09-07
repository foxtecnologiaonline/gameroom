import { IsEmail, IsIn, IsOptional, IsString } from "class-validator";

export class CreateCheckoutDto {
  @IsString()
  produtoId: string;

  @IsOptional()
  @IsEmail({}, { message: "E-mail inválido" })
  email?: string;
}

export class WebhookSimularDto {
  @IsString()
  vendaId: string;

  @IsIn(["aprovado", "recusado"])
  status: "aprovado" | "recusado";
}
