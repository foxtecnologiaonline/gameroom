import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { EstoqueService } from "./estoque.service";

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller("admin")
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get("estoque/:produtoId")
  estoqueDoProduto(@Param("produtoId") produtoId: string) {
    return this.estoqueService.resumoEUnidades(produtoId);
  }

  @Get("reabastecimentos")
  reabastecimentos() {
    return this.estoqueService.listarReabastecimentos();
  }
}
