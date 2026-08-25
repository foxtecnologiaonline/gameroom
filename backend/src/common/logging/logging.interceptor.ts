import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestComId } from './request-id.middleware';

/**
 * Loga uma linha estruturada por requisição HTTP (método, rota, status,
 * duração, requestId) — a base mínima de observabilidade para acompanhar o
 * ciclo venda → entrega em produção sem depender de um APM externo.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestComId>();
    const response = context.switchToHttp().getResponse();
    const inicio = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.registrar(request, response.statusCode, inicio),
        error: (erro) => this.registrar(request, erro?.status ?? 500, inicio),
      }),
    );
  }

  private registrar(request: RequestComId, statusCode: number, inicio: number) {
    const duracaoMs = Date.now() - inicio;
    this.logger.log(
      JSON.stringify({
        requestId: request.requestId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
        duracaoMs,
      }),
    );
  }
}
