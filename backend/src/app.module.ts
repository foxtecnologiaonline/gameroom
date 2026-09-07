import { Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module";
import { DbModule } from "./db/db.module";
import { DevolucoesModule } from "./devolucoes/devolucoes.module";
import { EstoqueModule } from "./estoque/estoque.module";
import { ProdutosModule } from "./produtos/produtos.module";
import { VendasModule } from "./vendas/vendas.module";

@Module({
  imports: [DbModule, AuthModule, ProdutosModule, VendasModule, DevolucoesModule, EstoqueModule],
})
export class AppModule {}
