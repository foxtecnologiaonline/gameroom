import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Cifra/decifra dados sensíveis (ex.: código de licença) em repouso e calcula
 * um hash determinístico (HMAC) para permitir checar duplicidade sem decifrar.
 *
 * Layout do buffer cifrado: [iv (12 bytes)][authTag (16 bytes)][ciphertext].
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private key!: Buffer;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const base64Key = this.config.get<string>('CODIGO_ENCRYPTION_KEY');
    if (!base64Key) {
      throw new Error('CODIGO_ENCRYPTION_KEY não configurada');
    }
    const key = Buffer.from(base64Key, 'base64');
    if (key.length !== 32) {
      throw new Error(
        'CODIGO_ENCRYPTION_KEY deve ter 32 bytes (base64 de uma chave AES-256)',
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, ciphertext]);
  }

  decrypt(payload: Buffer): string {
    const iv = payload.subarray(0, IV_LENGTH);
    const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  }

  /** HMAC-SHA256 determinístico, usado como índice único sem expor o valor em claro. */
  hash(plaintext: string): string {
    return crypto
      .createHmac('sha256', this.key)
      .update(plaintext, 'utf8')
      .digest('hex');
  }
}
