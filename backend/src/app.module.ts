import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
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
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          const { hostname, port, username, password, protocol } = new URL(
            redisUrl,
          );
          return {
            connection: {
              host: hostname,
              port: Number(port || 6379),
              username: username || undefined,
              password: password || undefined,
              tls: protocol === 'rediss:' ? {} : undefined,
            },
          };
        }
        return {
          connection: {
            host: config.get<string>('REDIS_HOST', 'localhost'),
            port: Number(config.get<string>('REDIS_PORT', '6379')),
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          },
        };
      },
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
