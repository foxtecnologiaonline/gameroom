import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  tamanho: number = 20;

  get skip(): number {
    return (this.pagina - 1) * this.tamanho;
  }

  get take(): number {
    return this.tamanho;
  }
}

export interface PaginatedResult<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
  totalPaginas: number;
}

export function paginar<T>(
  dados: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  return {
    dados,
    total,
    pagina: query.pagina,
    tamanho: query.tamanho,
    totalPaginas: Math.max(1, Math.ceil(total / query.tamanho)),
  };
}
