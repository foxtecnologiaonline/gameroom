import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Receiver } from '@upstash/qstash';
import { QstashSignatureGuard } from './qstash-signature.guard';

function contextoCom(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('QstashSignatureGuard', () => {
  it('aceita quando o Receiver confirma a assinatura', async () => {
    const receiver = {
      verify: jest.fn().mockResolvedValue(true),
    } as unknown as Receiver;
    const guard = new QstashSignatureGuard(receiver);

    const request = {
      headers: { 'upstash-signature': 'assinatura-valida' },
      rawBody: Buffer.from('{"itemPedidoId":"abc"}'),
    };

    await expect(guard.canActivate(contextoCom(request))).resolves.toBe(true);
    expect(receiver.verify).toHaveBeenCalledWith({
      signature: 'assinatura-valida',
      body: '{"itemPedidoId":"abc"}',
    });
  });

  it('rejeita quando o Receiver considera a assinatura inválida', async () => {
    const receiver = {
      verify: jest.fn().mockResolvedValue(false),
    } as unknown as Receiver;
    const guard = new QstashSignatureGuard(receiver);

    const request = {
      headers: { 'upstash-signature': 'assinatura-invalida' },
      rawBody: Buffer.from('{}'),
    };

    await expect(guard.canActivate(contextoCom(request))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita quando o header de assinatura está ausente', async () => {
    const receiver = { verify: jest.fn() } as unknown as Receiver;
    const guard = new QstashSignatureGuard(receiver);

    const request = { headers: {}, rawBody: Buffer.from('{}') };

    await expect(guard.canActivate(contextoCom(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(receiver.verify).not.toHaveBeenCalled();
  });

  it('rejeita quando não há rawBody (bootstrap sem rawBody: true)', async () => {
    const receiver = { verify: jest.fn() } as unknown as Receiver;
    const guard = new QstashSignatureGuard(receiver);

    const request = { headers: { 'upstash-signature': 'x' } };

    await expect(guard.canActivate(contextoCom(request))).rejects.toThrow(
      UnauthorizedException,
    );
    expect(receiver.verify).not.toHaveBeenCalled();
  });
});
