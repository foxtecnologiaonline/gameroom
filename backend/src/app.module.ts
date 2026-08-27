import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { RequestIdMiddleware } from './common/logging/request-id.middleware';
import { LoggingInterceptor } from './common/logging/logging.interceptor';
import { AuthModule } from './auth/auth.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { ProdutosModule } from './produtos/produtos.module';
import { EstoqueModule } from './estoque/estoque.module';
import { ConteudoModule } from './conteudo/conteudo.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { PagamentoModule } from './pagamento/pagamento.module';
import { DevolucoesModule } from './devolucoes/devolucoes.module';
import { AreaClienteModule } from './area-cliente/area-cliente.module';
import { FraudeModule } from './fraude/fraude.module';
import { NotaFiscalModule } from './nota-fiscal/nota-fiscal.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
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
    FraudeModule,
    NotaFiscalModule,
    JobsModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
