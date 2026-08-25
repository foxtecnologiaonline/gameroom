import { IsIn, IsOptional } from 'class-validator';
import { StatusPedido } from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

const VALORES_STATUS: StatusPedido[] = [
  'pendente',
  'confirmado',
  'cancelado',
  'estornado',
];

export class ListarPedidosQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(VALORES_STATUS)
  status?: StatusPedido;
}
