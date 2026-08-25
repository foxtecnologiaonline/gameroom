import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { ConteudoModule } from './conteudo/conteudo.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PagamentoModule } from './pagamento/pagamento.module';
import { DevolucoesModule } from './devolucoes/devolucoes.module';
import { AreaClienteModule } from './area-cliente/area-cliente.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: Number(config.get<string>('REDIS_PORT', '6379')),
        },
      }),
    }),
    PrismaModule,
    CryptoModule,
    AuthModule,
    AuditoriaModule,
    ProdutosModule,
    EstoqueModule,
    ConteudoModule,
    PedidosModule,
    PagamentoModule,
    DevolucoesModule,
    AreaClienteModule,
    JobsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
