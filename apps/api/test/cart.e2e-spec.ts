import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Cart (e2e)', () => {
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
    const token = await registerAndLogin(`seller-${randomUUID()}@example.com`);
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

  const createOffer = async (sellerToken: string, priceCents: number) => {
    const product = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: `Item ${randomUUID()}`, description: 'desc', categoryId })
      .expect(201);
    const offer = await request(app.getHttpServer())
      .post(`/api/products/${product.body.id}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ priceCents, stock: 10, condition: 'new', slaDays: 2 })
      .expect(201);
    return offer.body.id as string;
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

  it('rejects cart access without a token', () => {
    return request(app.getHttpServer()).get('/api/cart').expect(401);
  });

  it('rejects adding an unknown offer', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: randomUUID(), quantity: 1 })
      .expect(404);
  });

  it('starts empty, aggregates offers from different sellers, and increments on repeat adds', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    const empty = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(empty.body.items).toEqual([]);

    const sellerA = await becomeApprovedSeller();
    const sellerB = await becomeApprovedSeller();
    const offerA = await createOffer(sellerA, 1000);
    const offerB = await createOffer(sellerB, 2000);

    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: offerA, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: offerA, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: offerB, quantity: 1 })
      .expect(201);

    const cart = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(cart.body.items).toHaveLength(2);
    const lineA = cart.body.items.find(
      (i: { offerId: string }) => i.offerId === offerA,
    );
    expect(lineA.quantity).toBe(3);
    expect(lineA.offer.priceCents).toBe(1000);
    const lineB = cart.body.items.find(
      (i: { offerId: string }) => i.offerId === offerB,
    );
    expect(lineB.quantity).toBe(1);
  });

  it('lets the owner remove an item but rejects a stranger', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerToken = await becomeApprovedSeller();
    const offerId = await createOffer(sellerToken, 1500);

    const added = await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId, quantity: 1 })
      .expect(201);

    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );
    await request(app.getHttpServer())
      .delete(`/api/cart/items/${added.body.id}`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .delete(`/api/cart/items/${added.body.id}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(204);

    const cart = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(cart.body.items).toEqual([]);
  });
});
