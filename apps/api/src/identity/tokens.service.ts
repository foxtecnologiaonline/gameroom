import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { UserEntity } from './entities/user.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly refreshTokens: Repository<RefreshTokenEntity>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private expiresInSeconds(
    key: 'JWT_ACCESS_EXPIRES_SECONDS' | 'JWT_REFRESH_EXPIRES_SECONDS',
  ): number {
    return parseInt(this.config.get<string>(key, ''), 10);
  }

  private signAccessToken(user: UserEntity): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.expiresInSeconds('JWT_ACCESS_EXPIRES_SECONDS'),
    });
  }

  private async signRefreshToken(user: UserEntity): Promise<string> {
    return this.jwt.signAsync(
      { sub: user.id, jti: randomUUID() },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.expiresInSeconds('JWT_REFRESH_EXPIRES_SECONDS'),
      },
    );
  }

  async issueTokenPair(user: UserEntity): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(user),
      this.signRefreshToken(user),
    ]);

    const decoded = this.jwt.decode<{ exp: number }>(refreshToken);
    const row = this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.hash(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      revokedAt: null,
    });
    await this.refreshTokens.save(row);

    return { accessToken, refreshToken };
  }

  /**
   * Verifies a presented refresh token, revokes it, and returns the user id
   * it belongs to. Rotation happens here so a stolen-and-reused token is
   * rejected on its second use (the row is gone/revoked by then).
   */
  async consumeRefreshToken(token: string): Promise<string> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    const row = await this.refreshTokens.findOne({
      where: { tokenHash: this.hash(token), userId: payload.sub },
    });

    if (!row || row.revokedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    row.revokedAt = new Date();
    await this.refreshTokens.save(row);

    return payload.sub;
  }
}
