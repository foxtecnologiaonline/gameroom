import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Reviews (e2e)', () => {
  let app: INestApplication;
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

  const becomeApprovedSeller = async (): Promise<{
    token: string;
    sellerId: string;
  }> => {
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
    return { token, sellerId: apply.body.id as string };
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

  /** buyer checks out, pays, ships and delivers one offer from `sellerToken` */
  const deliveredSubOrder = async (buyerToken: string, sellerToken: string) => {
    const offerId = await createOffer(sellerToken, 1500);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: checkout.body.id, method: 'credit_card' })
      .expect(201);
    const subOrderId = checkout.body.subOrders[0].id as string;
    await request(app.getHttpServer())
      .post('/api/shipping/label')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        subOrderId,
        destinationZip: '01310-100',
        weightGrams: 500,
        carrier: 'correios-pac',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/suborders/${subOrderId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ status: 'delivered' })
      .expect(200);
    return subOrderId;
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

    const dataSource = app.get(DataSource);
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

  it('rejects reviewing a sub-order before delivery', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const { token: sellerToken } = await becomeApprovedSeller();
    const offerId = await createOffer(sellerToken, 1000);
    await request(app.getHttpServer())
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ offerId, quantity: 1 })
      .expect(201);
    const checkout = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(201);
    const subOrderId = checkout.body.subOrders[0].id;

    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ subOrderId, rating: 5 })
      .expect(409);
  });

  it('rejects a stranger reviewing someone else’s sub-order', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const { token: sellerToken } = await becomeApprovedSeller();
    const subOrderId = await deliveredSubOrder(buyerToken, sellerToken);

    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${strangerToken}`)
      .send({ subOrderId, rating: 1 })
      .expect(403);
  });

  it('lets the buyer review a delivered sub-order once, and lists it publicly by seller', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const { token: sellerToken, sellerId } = await becomeApprovedSeller();
    const subOrderId = await deliveredSubOrder(buyerToken, sellerToken);

    const review = await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ subOrderId, rating: 5, comment: 'Chegou rápido!' })
      .expect(201);
    expect(review.body.rating).toBe(5);

    // a second review for the same sub-order is a conflict
    await request(app.getHttpServer())
      .post('/api/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ subOrderId, rating: 3 })
      .expect(409);

    const list = await request(app.getHttpServer())
      .get(`/api/sellers/${sellerId}/reviews`)
      .expect(200);
    expect(list.body.some((r: { id: string }) => r.id === review.body.id)).toBe(
      true,
    );
  });

  it('404s listing reviews for an unknown seller', async () => {
    await request(app.getHttpServer())
      .get(`/api/sellers/${randomUUID()}/reviews`)
      .expect(404);
  });
});
