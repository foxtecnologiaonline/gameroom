import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Shipping (e2e)', () => {
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

  /** buyer checks out one offer from `sellerToken` and pays for it, returning the paid SubOrder id */
  const paidSubOrder = async (buyerToken: string, sellerToken: string) => {
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
    return checkout.body.subOrders[0].id as string;
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

  it('quotes shipping without needing an order', async () => {
    const someToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );

    const quote = await request(app.getHttpServer())
      .post('/api/shipping/quote')
      .set('Authorization', `Bearer ${someToken}`)
      .send({ destinationZip: '01310-100', weightGrams: 500 })
      .expect(201);

    expect(quote.body.length).toBeGreaterThanOrEqual(2);
    expect(quote.body[0]).toEqual(
      expect.objectContaining({
        carrier: expect.any(String),
        priceCents: expect.any(Number),
      }),
    );
  });

  it('rejects generating a label before the sub-order is paid', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerToken = await becomeApprovedSeller();
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
      .post('/api/shipping/label')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        subOrderId,
        destinationZip: '01310-100',
        weightGrams: 500,
        carrier: 'correios-pac',
      })
      .expect(409);
  });

  it('rejects a seller generating a label for someone else’s sub-order', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerToken = await becomeApprovedSeller();
    const strangerSellerToken = await becomeApprovedSeller();
    const subOrderId = await paidSubOrder(buyerToken, sellerToken);

    await request(app.getHttpServer())
      .post('/api/shipping/label')
      .set('Authorization', `Bearer ${strangerSellerToken}`)
      .send({
        subOrderId,
        destinationZip: '01310-100',
        weightGrams: 500,
        carrier: 'correios-pac',
      })
      .expect(403);
  });

  it('generates a label after payment, moves the sub-order to shipped, and lets buyer/seller track it', async () => {
    const buyerToken = await registerAndLogin(
      `buyer-${randomUUID()}@example.com`,
    );
    const sellerToken = await becomeApprovedSeller();
    const subOrderId = await paidSubOrder(buyerToken, sellerToken);

    const label = await request(app.getHttpServer())
      .post('/api/shipping/label')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        subOrderId,
        destinationZip: '01310-100',
        weightGrams: 500,
        carrier: 'correios-sedex',
      })
      .expect(201);
    expect(label.body.trackingCode).toEqual(expect.any(String));
    expect(label.body.status).toBe('label_created');

    // a second label for the same sub-order is a conflict
    await request(app.getHttpServer())
      .post('/api/shipping/label')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        subOrderId,
        destinationZip: '01310-100',
        weightGrams: 500,
        carrier: 'correios-pac',
      })
      .expect(409);

    const [subOrder] = await dataSource.query(
      `SELECT status FROM orders.sub_orders WHERE id = $1`,
      [subOrderId],
    );
    expect(subOrder.status).toBe('shipped');

    const trackingAsSeller = await request(app.getHttpServer())
      .get(`/api/shipping/${label.body.id}/tracking`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(trackingAsSeller.body.trackingCode).toBe(label.body.trackingCode);

    const trackingAsBuyer = await request(app.getHttpServer())
      .get(`/api/shipping/${label.body.id}/tracking`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(trackingAsBuyer.body.id).toBe(label.body.id);

    const strangerToken = await registerAndLogin(
      `stranger-${randomUUID()}@example.com`,
    );
    await request(app.getHttpServer())
      .get(`/api/shipping/${label.body.id}/tracking`)
      .set('Authorization', `Bearer ${strangerToken}`)
      .expect(403);
  });
});
