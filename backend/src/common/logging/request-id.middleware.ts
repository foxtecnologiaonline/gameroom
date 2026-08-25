import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export interface RequestComId extends Request {
  requestId: string;
}

/**
 * Propaga (ou gera) um x-request-id por requisição — usado para correlacionar
 * logs da mesma requisição em toda a cadeia (controller → service → job
 * enfileirado), essencial para depurar o fluxo assíncrono em produção.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestComId, res: Response, next: NextFunction) {
    const recebido = req.headers['x-request-id'];
    req.requestId =
      typeof recebido === 'string' && recebido.length > 0
        ? recebido
        : randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
