import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VendasService } from "./vendas.service";

@UseGuards(JwtAuthGuard)
@Controller("minhas-compras")
export class MinhasComprasController {
  constructor(private readonly vendasService: VendasService) {}

  @Get()
  listar(@Req() req: any) {
    return this.vendasService.listarDoUsuario(req.user);
  }

  @Get(":vendaId")
  detalhe(@Param("vendaId") vendaId: string, @Req() req: any) {
    return this.vendasService.obterDoUsuario(vendaId, req.user);
  }
}
