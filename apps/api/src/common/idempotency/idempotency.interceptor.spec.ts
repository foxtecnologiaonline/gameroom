import {
  BadRequestException,
  CallHandler,
  ConflictException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyStatus } from './idempotency-status.enum';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let records: {
    findOne: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let reflector: { get: jest.Mock };
  let response: { status: jest.Mock };

  const buildContext = (headers: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          method: 'POST',
          originalUrl: '/api/offers/1/reserve',
        }),
        getResponse: () => response,
      }),
      getHandler: () => ({}),
    }) as unknown as ExecutionContext;

  const handlerReturning = (value: unknown): CallHandler => ({
    handle: () => of(value),
  });

  beforeEach(() => {
    records = {
      findOne: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    reflector = { get: jest.fn().mockReturnValue(undefined) };
    response = { status: jest.fn() };
    interceptor = new IdempotencyInterceptor(
      records as any,
      reflector as unknown as Reflector,
    );
  });

  it('rejects a request with no Idempotency-Key header', async () => {
    await expect(
      interceptor.intercept(buildContext({}), handlerReturning({ ok: true })),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(records.insert).not.toHaveBeenCalled();
  });

  it('runs the handler and stores the response on the first call', async () => {
    records.findOne.mockResolvedValue(null);
    const ctx = buildContext({ 'idempotency-key': 'key-1' });
    const handler = handlerReturning({ id: 'offer-1' });

    const observable = await interceptor.intercept(ctx, handler);
    const result = await lastValueFrom(observable);

    expect(result).toEqual({ id: 'offer-1' });
    expect(records.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'key-1',
        status: IdempotencyStatus.Processing,
      }),
    );
    expect(records.update).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'key-1' }),
      expect.objectContaining({
        status: IdempotencyStatus.Completed,
        responseStatus: 201,
      }),
    );
  });

  it('replays the stored response instead of re-running the handler', async () => {
    records.findOne.mockResolvedValue({
      status: IdempotencyStatus.Completed,
      responseStatus: 201,
      responseBody: { id: 'offer-1' },
    });
    const ctx = buildContext({ 'idempotency-key': 'key-1' });
    const handler = { handle: jest.fn() };

    const observable = await interceptor.intercept(
      ctx,
      handler as unknown as CallHandler,
    );
    const result = await lastValueFrom(observable);

    expect(result).toEqual({ id: 'offer-1' });
    expect(handler.handle).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(201);
  });

  it('rejects a concurrent request still processing under the same key', async () => {
    records.findOne.mockResolvedValue({ status: IdempotencyStatus.Processing });
    const ctx = buildContext({ 'idempotency-key': 'key-1' });

    await expect(
      interceptor.intercept(ctx, handlerReturning({})),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deletes the record when the handler fails, so the key can be retried', async () => {
    records.findOne.mockResolvedValue(null);
    const ctx = buildContext({ 'idempotency-key': 'key-1' });
    const handler: CallHandler = {
      handle: () => throwError(() => new Error('boom')),
    };

    const observable = await interceptor.intercept(ctx, handler);
    await expect(lastValueFrom(observable)).rejects.toThrow('boom');
    expect(records.delete).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'key-1' }),
    );
  });
});
