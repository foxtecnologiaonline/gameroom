import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

const URL_ASSINADA_EXPIRACAO_SEGUNDOS = 15 * 60;

@Injectable()
export class StorageService implements OnModuleInit {
  private client!: S3Client;
  private bucket!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.bucket = this.config.get<string>('S3_BUCKET') ?? '';
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    this.client = new S3Client({
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('S3_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  /** Faz upload e retorna a chave do objeto (não a URL pública — o acesso é sempre via URL assinada). */
  async upload(
    produtoId: string,
    arquivo: Express.Multer.File,
  ): Promise<string> {
    const key = `produtos/${produtoId}/${randomUUID()}-${arquivo.originalname}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: arquivo.buffer,
        ContentType: arquivo.mimetype,
      }),
    );
    return key;
  }

  async urlAssinada(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, {
      expiresIn: URL_ASSINADA_EXPIRACAO_SEGUNDOS,
    });
  }
}
