import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Checkout (e2e)', () => {
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

  const createOffer = async (
    sellerToken: string,
    priceCents: number,
    stock: number,
  ) => {
    const product = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: `Item ${randomUUID()}`, description: 'desc', categoryId })
      .expect(201);
    const offer = await request(app.getHttpServer())
      .post(`/api/products/${product.body.id}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ priceCents, stock, condition: 'new', slaDays: 2 })
      .expect(201);
    return {
      productId: product.body.id as string,
      offerId: offer.body.id as string,
    };
  };

  const stockOf = async (
    productId: string,
    offerId: string,
  ): Promise<number> => {
    const res = await request(app.getHttpServer())
      .get(`/api/products/${productId}`)
      .expect(200);
    return res.body.offers.find((o: { id: string }) => o.id === offerId).stock;
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

  it('rejects checkout with an empty cart', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(409);
  });

  it('rejects checkout without an Idempotency-Key header', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(400);
  });

  it('turns a multi-seller cart into 1 Order + N SubOrder, reserves stock, and empties the cart', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerA = await becomeApprovedSeller();
    const sellerB = await becomeApprovedSeller();
    const a = await createOffer(sellerA, 1000, 5);
    const b = await createOffer(sellerB, 2000, 5);

    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: a.offerId, quantity: 2 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: b.offerId, quantity: 1 })
      .expect(201);

    const idempotencyKey = randomUUID();
    const checkout = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .expect(201);

    expect(checkout.body.totalCents).toBe(2 * 1000 + 1 * 2000);
    expect(checkout.body.subOrders).toHaveLength(2);
    const subOrderA = checkout.body.subOrders.find(
      (so: { items: { offerId: string }[] }) =>
        so.items[0].offerId === a.offerId,
    );
    expect(subOrderA.subtotalCents).toBe(2000);
    expect(subOrderA.items[0].quantity).toBe(2);
    const subOrderB = checkout.body.subOrders.find(
      (so: { items: { offerId: string }[] }) =>
        so.items[0].offerId === b.offerId,
    );
    expect(subOrderB.subtotalCents).toBe(2000);

    expect(await stockOf(a.productId, a.offerId)).toBe(3);
    expect(await stockOf(b.productId, b.offerId)).toBe(4);

    const cartAfter = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(cartAfter.body.items).toEqual([]);

    // replaying the same Idempotency-Key must not create a second order
    const replay = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .expect(201);
    expect(replay.body.id).toBe(checkout.body.id);
    expect(await stockOf(a.productId, a.offerId)).toBe(3);
  });

  it('rolls back every reservation when one item in the cart runs out of stock', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerA = await becomeApprovedSeller();
    const sellerB = await becomeApprovedSeller();
    const a = await createOffer(sellerA, 1000, 5);
    const b = await createOffer(sellerB, 2000, 1);

    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: a.offerId, quantity: 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId: b.offerId, quantity: 5 }) // more than the 1 in stock
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(409);

    // offer A's stock must have been released, not left reserved
    expect(await stockOf(a.productId, a.offerId)).toBe(5);
    expect(await stockOf(b.productId, b.offerId)).toBe(1);

    // the cart survives a failed checkout so the buyer can retry
    const cart = await request(app.getHttpServer())
      .get('/api/cart')
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(cart.body.items).toHaveLength(2);
  });
});
