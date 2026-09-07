import { Controller, Get, Param, Patch, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { DevolucoesService } from "./devolucoes.service";

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin/devolucoes")
export class AdminDevolucoesController {
  constructor(private readonly devolucoesService: DevolucoesService) {}

  @Get("revisao-manual")
  filaRevisaoManual() {
    return this.devolucoesService.filaRevisaoManual();
  }

  @Patch(":id/aprovar")
  aprovar(@Param("id") id: string) {
    return this.devolucoesService.aprovar(id);
  }

  @Patch(":id/rejeitar")
  rejeitar(@Param("id") id: string) {
    return this.devolucoesService.rejeitar(id);
  }
}
