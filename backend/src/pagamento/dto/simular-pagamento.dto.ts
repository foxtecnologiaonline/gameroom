import { IsIn } from 'class-validator';

export class SimularPagamentoDto {
  @IsIn(['aprovado', 'recusado'])
  status!: 'aprovado' | 'recusado';
}
