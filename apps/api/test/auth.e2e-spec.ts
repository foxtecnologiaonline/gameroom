import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const email = `e2e-${randomUUID()}@example.com`;
  const password = 'senha1234';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects registration with an invalid payload', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('registers a new user and returns a token pair', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);

    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('rejects registering the same e-mail twice', () => {
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(409);
  });

  it('rejects login with a wrong password', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'senha-errada' })
      .expect(401);
  });

  it('rejects GET /me without a token', () => {
    return request(app.getHttpServer()).get('/api/me').expect(401);
  });

  it('logs in, reads /me, and rotates the refresh token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);

    const { accessToken, refreshToken } = login.body;

    const me = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email, roles: ['buyer'] });

    const refreshed = await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));

    // reuse of an already-rotated refresh token must be rejected
    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
