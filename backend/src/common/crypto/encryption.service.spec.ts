import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(() => {
    const config = {
      get: () => 'Yw8nK+L2oCpsg7cqZT/r2WxrJly+7qyU9kldkqQpf2c=',
    } as unknown as ConfigService;
    service = new EncryptionService(config);
    service.onModuleInit();
  });

  it('decifra exatamente o texto original', () => {
    const original = 'ABCDE-11111-XXXXX';
    const cifrado = service.encrypt(original);
    expect(service.decrypt(cifrado)).toBe(original);
  });

  it('gera cifrados diferentes para o mesmo texto (IV aleatório)', () => {
    const a = service.encrypt('mesmo-codigo');
    const b = service.encrypt('mesmo-codigo');
    expect(a.equals(b)).toBe(false);
  });

  it('hash é determinístico (permite checar duplicidade sem decifrar)', () => {
    expect(service.hash('ABCDE-11111-XXXXX')).toBe(
      service.hash('ABCDE-11111-XXXXX'),
    );
    expect(service.hash('ABCDE-11111-XXXXX')).not.toBe(
      service.hash('ABCDE-22222-XXXXX'),
    );
  });

  it('rejeita chave com tamanho diferente de 32 bytes', () => {
    const config = {
      get: () => 'Y2hhdmVfY3VydGE=',
    } as unknown as ConfigService;
    const invalido = new EncryptionService(config);
    expect(() => invalido.onModuleInit()).toThrow();
  });
});
