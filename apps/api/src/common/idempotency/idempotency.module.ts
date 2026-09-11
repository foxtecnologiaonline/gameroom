import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdempotencyRecordEntity } from './idempotency-record.entity';
import { IdempotencyInterceptor } from './idempotency.interceptor';

const IdempotencyRepositoryModule = TypeOrmModule.forFeature([
  IdempotencyRecordEntity,
]);

@Module({
  imports: [IdempotencyRepositoryModule],
  providers: [IdempotencyInterceptor],
  // Re-exporting the TypeOrm module (not just the interceptor) is required:
  // `@UseInterceptors(IdempotencyInterceptor)` resolves the interceptor's
  // own dependencies inside the *consuming* module's injector, so that
  // module needs the repository provider too, not just the class token.
  exports: [IdempotencyRepositoryModule, IdempotencyInterceptor],
})
export class IdempotencyModule {}
