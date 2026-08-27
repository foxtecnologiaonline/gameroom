import { IsInt, IsUUID, Min } from 'class-validator';

export class GerarEstoqueInicialJobDto {
  @IsUUID()
  produtoId!: string;

  @IsInt()
  @Min(1)
  quantidade!: number;
}

export class ReabastecerEstoqueJobDto {
  @IsUUID()
  produtoId!: string;
}

export class LiberarReservaExpiradaJobDto {
  @IsUUID()
  itemPedidoId!: string;
}

export class EmitirEEntregarJobDto {
  @IsUUID()
  itemPedidoId!: string;
}

export class ProcessarDevolucaoJobDto {
  @IsUUID()
  devolucaoId!: string;
}

export class EmitirNotaFiscalJobDto {
  @IsUUID()
  pedidoId!: string;
}
