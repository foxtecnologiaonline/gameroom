import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CriarConteudoDto {
  @IsIn(['manual', 'cartilha', 'video'])
  tipo!: 'manual' | 'cartilha' | 'video';

  @IsString()
  @MinLength(2)
  titulo!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem?: number;
}
