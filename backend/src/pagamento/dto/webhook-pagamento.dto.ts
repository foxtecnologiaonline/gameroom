import { IsIn, IsString, IsUUID } from 'class-validator';

export class WebhookPagamentoDto {
  @IsUUID()
  pedidoId!: string;

  @IsString()
  transacaoId!: string;

  @IsIn(['aprovado', 'recusado'])
  status!: 'aprovado' | 'recusado';
}
