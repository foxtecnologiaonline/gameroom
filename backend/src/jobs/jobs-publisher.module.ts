import { Module } from '@nestjs/common';
import { QstashClientModule } from './qstash-client.module';
import { JobsPublisherService } from './jobs-publisher.service';

/**
 * Módulo "leve" — só o necessário para publicar jobs (produtores), análogo
 * ao antigo `QueuesModule`. Os controllers HTTP que consomem os jobs (e as
 * dependências de domínio que eles trazem) ficam em `JobsModule`, importado
 * só pelo `AppModule` — separar evita dependência circular entre os módulos
 * de domínio que produzem jobs e os que os consomem.
 */
@Module({
  imports: [QstashClientModule],
  providers: [JobsPublisherService],
  exports: [JobsPublisherService],
})
export class JobsPublisherModule {}
