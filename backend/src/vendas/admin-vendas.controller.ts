import { Controller, Get, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { VendasService } from "./vendas.service";

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/vendas")
export class AdminVendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Get()
  listar() {
    return this.vendasService.listarTodas();
  }
}
