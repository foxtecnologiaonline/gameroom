import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

describe('Sellers (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const password = 'senha1234';

  const registerAndLogin = async (email: string) => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password })
      .expect(201);
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password })
      .expect(200);
    return login.body.accessToken as string;
  };

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

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
      throw new Error(
        'ADMIN_EMAIL/ADMIN_PASSWORD ausentes: rode `npm run seed:admin` antes do e2e',
      );
    }
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);
    adminToken = adminLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects POST /sellers without a token', () => {
    return request(app.getHttpServer())
      .post('/api/sellers')
      .send({ storeName: 'Loja', document: '12345678900' })
      .expect(401);
  });

  it('walks a seller from application through admin approval', async () => {
    const sellerEmail = `seller-${randomUUID()}@example.com`;
    const buyerToken = await registerAndLogin(sellerEmail);

    const apply = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ storeName: 'Loja do Zé', document: '12345678900' })
      .expect(201);
    expect(apply.body).toMatchObject({ status: 'pending', recipientId: null });
    const sellerId = apply.body.id;

    // duplicate application
    await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ storeName: 'Outra loja', document: '12345678900' })
      .expect(409);

    // a stranger cannot read someone else's seller profile
    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );
    await request(app.getHttpServer())
      .get(`/api/sellers/${sellerId}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);

    // the owner can read their own profile
    await request(app.getHttpServer())
      .get(`/api/sellers/${sellerId}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);

    // a non-admin cannot approve
    await request(app.getHttpServer())
      .patch(`/api/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ status: 'approved' })
      .expect(403);

    // admin approves: recipient gets registered and the user is promoted
    const approve = await request(app.getHttpServer())
      .patch(`/api/sellers/${sellerId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' })
      .expect(200);
    expect(approve.body.status).toBe('approved');
    expect(approve.body.recipientId).toEqual(expect.any(String));
    expect(approve.body.approvedAt).not.toBeNull();

    const me = await request(app.getHttpServer())
      .get('/api/me')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(me.body.roles).toEqual(expect.arrayContaining(['buyer', 'seller']));
  });
});
