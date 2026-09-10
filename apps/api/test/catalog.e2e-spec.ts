import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Catalog (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let categoryId: string;
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

  const becomeApprovedSeller = async (): Promise<string> => {
    const email = `seller-${randomUUID()}@example.com`;
    const token = await registerAndLogin(email);
    const apply = await request(app.getHttpServer())
      .post('/api/sellers')
      .set('Authorization', `Bearer ${token}`)
      .send({ storeName: `Loja ${randomUUID()}`, document: '12345678900' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/sellers/${apply.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' })
      .expect(200);
    return token;
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

    dataSource = app.get(DataSource);
    const [category] = await dataSource.query(
      `SELECT id FROM catalog.categories WHERE slug = 'jogos'`,
    );
    categoryId = category.id;

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

  it('rejects product creation from a plain buyer', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ title: 'Conta X', description: 'desc', categoryId })
      .expect(403);
  });

  it('404s for an unknown product', () => {
    return request(app.getHttpServer())
      .get(`/api/products/${randomUUID()}`)
      .expect(404);
  });

  it('creates a product, lists it in search, and tracks the buybox across offers', async () => {
    const sellerAToken = await becomeApprovedSeller();
    const title = `Conta Premium ${randomUUID()}`;

    const created = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({
        title,
        description: 'Conta com skins raras',
        categoryId,
        brand: 'Riot',
      })
      .expect(201);
    const productId = created.body.id;

    const search = await request(app.getHttpServer())
      .get('/api/products')
      .query({ query: title })
      .expect(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0].id).toBe(productId);

    // a non-approved buyer cannot create offers
    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );
    await request(app.getHttpServer())
      .post(`/api/products/${productId}/offers`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ priceCents: 1000, stock: 5, condition: 'new', slaDays: 2 })
      .expect(403);

    const offerA = await request(app.getHttpServer())
      .post(`/api/products/${productId}/offers`)
      .set('Authorization', `Bearer ${sellerAToken}`)
      .send({ priceCents: 5000, stock: 3, condition: 'new', slaDays: 2 })
      .expect(201);
    expect(offerA.body.isBuyboxWinner).toBe(true);

    const sellerBToken = await becomeApprovedSeller();
    const offerB = await request(app.getHttpServer())
      .post(`/api/products/${productId}/offers`)
      .set('Authorization', `Bearer ${sellerBToken}`)
      .send({ priceCents: 3000, stock: 1, condition: 'used', slaDays: 5 })
      .expect(201);
    expect(offerB.body.isBuyboxWinner).toBe(true);

    const withOffers = await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200);
    expect(withOffers.body.offers).toHaveLength(2);
    const winner = withOffers.body.offers.find(
      (o: { isBuyboxWinner: boolean }) => o.isBuyboxWinner,
    );
    expect(winner.id).toBe(offerB.body.id);
    const loser = withOffers.body.offers.find(
      (o: { id: string }) => o.id === offerA.body.id,
    );
    expect(loser.isBuyboxWinner).toBe(false);
  });
});
