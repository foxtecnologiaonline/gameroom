import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

class ItemPedidoInputDto {
  @IsUUID()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class CriarPedidoDto {
  @IsEmail()
  compradorEmail!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ItemPedidoInputDto)
  itens!: ItemPedidoInputDto[];
}
