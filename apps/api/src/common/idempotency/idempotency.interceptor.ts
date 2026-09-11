import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, from, of } from 'rxjs';
import { catchError, concatMap } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { IdempotencyRecordEntity } from './idempotency-record.entity';
import { IdempotencyStatus } from './idempotency-status.enum';

/**
 * Enforces the Idempotency-Key contract: a request replayed with the same
 * key + method + path returns the exact same response instead of
 * re-running the handler. Used on every endpoint that moves stock or
 * money (see CLAUDE.md "regras não-negociáveis").
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(IdempotencyRecordEntity)
    private readonly records: Repository<IdempotencyRecordEntity>,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const key = request.headers['idempotency-key'];
    if (!key || typeof key !== 'string') {
      throw new BadRequestException('Header Idempotency-Key é obrigatório');
    }

    const method = request.method;
    const path = request.originalUrl ?? request.url;
    const defaultStatus =
      this.reflector.get<number>(HTTP_CODE_METADATA, context.getHandler()) ??
      (method === 'POST' ? 201 : 200);

    const existing = await this.records.findOne({
      where: { key, method, path },
    });
    if (existing) {
      if (existing.status === IdempotencyStatus.Processing) {
        throw new ConflictException(
          'Requisição com esta Idempotency-Key ainda está em processamento',
        );
      }
      response.status(existing.responseStatus);
      return of(existing.responseBody);
    }

    try {
      await this.records.insert({
        key,
        method,
        path,
        status: IdempotencyStatus.Processing,
      });
    } catch {
      throw new ConflictException(
        'Requisição com esta Idempotency-Key ainda está em processamento',
      );
    }

    return next.handle().pipe(
      // concatMap (not tap) so the response only goes out once the record
      // is durably marked completed — otherwise a client could receive
      // the reply and retry with the same key before the write lands,
      // racing its own replay into a spurious 409.
      concatMap((body: unknown) =>
        from(
          (async () => {
            try {
              await this.records.update(
                { key, method, path },
                {
                  status: IdempotencyStatus.Completed,
                  responseStatus: defaultStatus,
                  responseBody: body ?? null,
                  completedAt: new Date(),
                },
              );
            } catch {
              // best-effort cache write: the operation itself already
              // succeeded, so the request must not fail because of this.
            }
            return body;
          })(),
        ),
      ),
      catchError((err) =>
        from(
          (async () => {
            try {
              await this.records.delete({ key, method, path });
            } catch {
              // best-effort cleanup; the original error still wins below.
            }
            throw err;
          })(),
        ),
      ),
    );
  }
}
