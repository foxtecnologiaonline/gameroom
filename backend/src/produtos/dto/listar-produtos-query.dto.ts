import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination/pagination.dto';

export class ListarProdutosQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  categoria?: string;
}
