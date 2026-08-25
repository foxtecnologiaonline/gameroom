import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Erro interno inesperado' };

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : exception,
      );
    }

    response
      .status(status)
      .json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
  }
}
