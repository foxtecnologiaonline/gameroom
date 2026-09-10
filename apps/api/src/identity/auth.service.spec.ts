import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserEntity } from './entities/user.entity';
import { Role } from './role.enum';
import { TokensService } from './tokens.service';
import { UsersService } from './users.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UsersService>;
  let tokens: jest.Mocked<TokensService>;

  const buildUser = (overrides: Partial<UserEntity> = {}): UserEntity =>
    ({
      id: 'user-1',
      email: 'buyer@example.com',
      passwordHash: '',
      roles: [Role.Buyer],
      createdAt: new Date(),
      ...overrides,
    }) as UserEntity;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: TokensService,
          useValue: {
            issueTokenPair: jest.fn(),
            consumeRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    users = module.get(UsersService);
    tokens = module.get(TokensService);
  });

  describe('register', () => {
    it('creates the user and issues tokens on the happy path', async () => {
      users.findByEmail.mockResolvedValue(null);
      const created = buildUser();
      users.create.mockResolvedValue(created);
      tokens.issueTokenPair.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      const result = await service.register({
        email: 'buyer@example.com',
        password: 'senha1234',
      });

      expect(users.create).toHaveBeenCalledWith(
        'buyer@example.com',
        expect.any(String),
      );
      expect(tokens.issueTokenPair).toHaveBeenCalledWith(created);
      expect(result).toEqual({ accessToken: 'a', refreshToken: 'r' });
    });

    it('rejects a duplicate e-mail', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expect(
        service.register({ email: 'buyer@example.com', password: 'senha1234' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tokens.issueTokenPair).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues tokens when the password matches', async () => {
      const passwordHash = await bcrypt.hash('senha1234', 4);
      users.findByEmail.mockResolvedValue(buildUser({ passwordHash }));
      tokens.issueTokenPair.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      });

      const result = await service.login({
        email: 'buyer@example.com',
        password: 'senha1234',
      });

      expect(result).toEqual({ accessToken: 'a', refreshToken: 'r' });
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await bcrypt.hash('senha1234', 4);
      users.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        service.login({ email: 'buyer@example.com', password: 'errada' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an unknown e-mail', async () => {
      users.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ninguem@example.com', password: 'senha1234' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('rotates tokens for a valid refresh token', async () => {
      tokens.consumeRefreshToken.mockResolvedValue('user-1');
      const user = buildUser();
      users.findById.mockResolvedValue(user);
      tokens.issueTokenPair.mockResolvedValue({
        accessToken: 'a2',
        refreshToken: 'r2',
      });

      const result = await service.refresh('old-refresh-token');

      expect(tokens.consumeRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(result).toEqual({ accessToken: 'a2', refreshToken: 'r2' });
    });

    it('rejects when the user behind the token no longer exists', async () => {
      tokens.consumeRefreshToken.mockResolvedValue('deleted-user');
      users.findById.mockResolvedValue(null);

      await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
