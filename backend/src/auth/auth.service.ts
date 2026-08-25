import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { JwtPayload } from './jwt-payload.interface';

const SALT_ROUNDS = 12;

export interface TokensDto {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async registrarCliente(
    nome: string,
    email: string,
    senha: string,
  ): Promise<TokensDto> {
    return this.criarUsuario(nome, email, senha, 'cliente');
  }

  async criarAdmin(
    nome: string,
    email: string,
    senha: string,
  ): Promise<TokensDto> {
    return this.criarUsuario(nome, email, senha, 'admin');
  }

  private async criarUsuario(
    nome: string,
    email: string,
    senha: string,
    tipo: 'admin' | 'cliente',
  ): Promise<TokensDto> {
    const existente = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (existente) {
      throw new ConflictException('E-mail já cadastrado');
    }
    const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);
    const usuario = await this.prisma.usuario.create({
      data: { nome, email, senhaHash, tipo },
    });
    return this.gerarTokens({
      sub: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    });
  }

  async login(email: string, senha: string): Promise<TokensDto> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !(await bcrypt.compare(senha, usuario.senhaHash))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    return this.gerarTokens({
      sub: usuario.id,
      email: usuario.email,
      tipo: usuario.tipo,
    });
  }

  async renovar(refreshToken: string): Promise<TokensDto> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
      return this.gerarTokens({
        sub: payload.sub,
        email: payload.email,
        tipo: payload.tipo,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }
  }

  private async gerarTokens(payload: JwtPayload): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') as never,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN') as never,
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
