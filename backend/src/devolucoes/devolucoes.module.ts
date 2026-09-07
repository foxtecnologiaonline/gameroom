import { Module } from "@nestjs/common";
import { VendasModule } from "../vendas/vendas.module";
import { AdminDevolucoesController } from "./admin-devolucoes.controller";
import { DevolucoesController } from "./devolucoes.controller";
import { DevolucoesService } from "./devolucoes.service";

@Module({
  imports: [VendasModule],
  controllers: [DevolucoesController, AdminDevolucoesController],
  providers: [DevolucoesService],
})
export class DevolucoesModule {}
