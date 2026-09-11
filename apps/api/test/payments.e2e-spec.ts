import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Payments (e2e)', () => {
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

  const checkoutWithTwoSellers = async (buyerToken: string) => {
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
      .send({ offerId: offerB, quantity: 1 })
      .expect(201);

    const checkout = await request(app.getHttpServer())
      .post('/api/checkout')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .expect(201);

    return checkout.body as {
      id: string;
      subOrders: { id: string; status: string }[];
    };
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

  it('rejects charging an order that belongs to someone else', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const order = await checkoutWithTwoSellers(buyerToken);
    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );

    await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${strangerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: order.id, method: 'credit_card' })
      .expect(403);
  });

  it('settles a credit_card charge synchronously and moves both sub-orders to paid', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const order = await checkoutWithTwoSellers(buyerToken);
    const idempotencyKey = randomUUID();

    const charge = await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ orderId: order.id, method: 'credit_card' })
      .expect(201);
    expect(charge.body.status).toBe('paid');
    expect(charge.body.totalCents).toBe(3000);

    const split = await dataSource.query(
      `SELECT seller_id, amount_cents, status FROM payments.split_transactions WHERE payment_id = $1 ORDER BY amount_cents`,
      [charge.body.id],
    );
    expect(split).toHaveLength(2);
    expect(
      split.every((row: { status: string }) => row.status === 'paid'),
    ).toBe(true);

    // a second charge for the same order is a conflict
    await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: order.id, method: 'credit_card' })
      .expect(409);

    // replaying the same Idempotency-Key returns the original charge, no new payment created
    const replay = await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({ orderId: order.id, method: 'credit_card' })
      .expect(201);
    expect(replay.body.id).toBe(charge.body.id);
  });

  it('settles a PIX charge only after the webhook confirms it, and the webhook is idempotent', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const order = await checkoutWithTwoSellers(buyerToken);

    const charge = await request(app.getHttpServer())
      .post('/api/payments/charge')
      .set('Authorization', `Bearer ${buyerToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({ orderId: order.id, method: 'pix' })
      .expect(201);
    expect(charge.body.status).toBe('pending');

    const [subOrderBeforeWebhook] = await dataSource.query(
      `SELECT status FROM orders.sub_orders WHERE order_id = $1 LIMIT 1`,
      [order.id],
    );
    expect(subOrderBeforeWebhook.status).toBe('pending');

    // unknown gatewayId
    await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .send({ gatewayId: 'does-not-exist', status: 'paid' })
      .expect(404);

    const webhook = await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .send({ gatewayId: charge.body.gatewayId, status: 'paid' })
      .expect(200);
    expect(webhook.body.status).toBe('paid');

    const subOrdersAfter = await dataSource.query(
      `SELECT status FROM orders.sub_orders WHERE order_id = $1`,
      [order.id],
    );
    expect(
      subOrdersAfter.every((row: { status: string }) => row.status === 'paid'),
    ).toBe(true);

    // replaying the same webhook status is a no-op, not an error
    await request(app.getHttpServer())
      .post('/api/payments/webhook')
      .send({ gatewayId: charge.body.gatewayId, status: 'paid' })
      .expect(200);

    const splitRows = await dataSource.query(
      `SELECT status FROM payments.split_transactions WHERE payment_id = (
         SELECT id FROM payments.payments WHERE gateway_id = $1
       )`,
      [charge.body.gatewayId],
    );
    // one row per seller at charge time (pending) + one per seller from the webhook (paid);
    // the idempotent replay must not have appended a third batch
    expect(splitRows).toHaveLength(4);
  });
});
