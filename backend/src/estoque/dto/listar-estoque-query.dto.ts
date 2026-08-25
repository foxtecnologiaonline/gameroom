import { IsIn, IsOptional } from 'class-validator';
import { StatusUnidade } from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

const VALORES_STATUS: StatusUnidade[] = [
  'aguardando_codigo',
  'disponivel',
  'reservado',
  'vendido',
  'devolvido',
  'bloqueado',
];

export class ListarEstoqueQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(VALORES_STATUS)
  status?: StatusUnidade;
}
