import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ProdutosModule } from "../produtos/produtos.module";
import { AdminVendasController } from "./admin-vendas.controller";
import { CheckoutController, VendasPublicasController } from "./checkout.controller";
import { MinhasComprasController } from "./minhas-compras.controller";
import { VendasService } from "./vendas.service";

@Module({
  imports: [AuthModule, ProdutosModule],
  controllers: [CheckoutController, VendasPublicasController, MinhasComprasController, AdminVendasController],
  providers: [VendasService],
  exports: [VendasService],
})
export class VendasModule {}
