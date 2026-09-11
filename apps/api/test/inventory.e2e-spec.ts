import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Inventory (e2e)', () => {
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

  const createOffer = async (sellerToken: string, stock: number) => {
    const product = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ title: `Item ${randomUUID()}`, description: 'desc', categoryId })
      .expect(201);
    const offer = await request(app.getHttpServer())
      .post(`/api/products/${product.body.id}/offers`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ priceCents: 1000, stock, condition: 'new', slaDays: 2 })
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

  it('rejects a reserve request without an Idempotency-Key header', async () => {
    const sellerToken = await becomeApprovedSeller();
    const { offerId } = await createOffer(sellerToken, 5);
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post(`/api/offers/${offerId}/reserve`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ quantity: 1 })
      .expect(400);
  });

  it('reserves and releases stock, replaying the same result for a repeated Idempotency-Key', async () => {
    const sellerToken = await becomeApprovedSeller();
    const { productId, offerId } = await createOffer(sellerToken, 5);
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const idempotencyKey = randomUUID();

    const reserve = await request(app.getHttpServer())
      .post(`/api/offers/${offerId}/reserve`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ quantity: 2 })
      .expect(201);
    const reservationId = reserve.body.id;
    expect(await stockOf(productId, offerId)).toBe(3);

    // replaying the exact same request must not reserve a second time
    const replay = await request(app.getHttpServer())
      .post(`/api/offers/${offerId}/reserve`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ quantity: 2 })
      .expect(201);
    expect(replay.body.id).toBe(reservationId);
    expect(await stockOf(productId, offerId)).toBe(3);

    // release gives the stock back
    await request(app.getHttpServer())
      .post(`/api/offers/${offerId}/release`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ reservationId })
      .expect(200);
    expect(await stockOf(productId, offerId)).toBe(5);

    // releasing an already-released reservation is a conflict
    await request(app.getHttpServer())
      .post(`/api/offers/${offerId}/release`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ reservationId })
      .expect(409);
  });

  it('lets the owning seller set stock but rejects everyone else', async () => {
    const sellerToken = await becomeApprovedSeller();
    const { offerId } = await createOffer(sellerToken, 5);
    const strangerSellerToken = await becomeApprovedSeller();

    await request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/stock`)
      .set('Authorization', `Bearer ${strangerSellerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ stock: 20 })
      .expect(403);

    const updated = await request(app.getHttpServer())
      .patch(`/api/offers/${offerId}/stock`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ stock: 20 })
      .expect(200);
    expect(updated.body.stock).toBe(20);
  });

  it('never oversells under concurrent reservations for the same offer', async () => {
    const sellerToken = await becomeApprovedSeller();
    const { offerId } = await createOffer(sellerToken, 1);
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    const attempt = () =>
      request(app.getHttpServer())
        .post(`/api/offers/${offerId}/reserve`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ quantity: 1 });

    const [first, second] = await Promise.all([attempt(), attempt()]);
    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
