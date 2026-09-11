import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';

describe('Orders (e2e)', () => {
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

  /** buyer checks out and pays for one offer from `sellerToken`, returning {orderId, subOrderId} */
  const paidOrder = async (buyerToken: string, sellerToken: string) => {
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
    return {
      orderId: checkout.body.id as string,
      subOrderId: checkout.body.subOrders[0].id as string,
    };
  };

  const shipSubOrder = async (sellerToken: string, subOrderId: string) => {
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

  describe('GET /orders/:id', () => {
    it('404s for an unknown order', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      await request(app.getHttpServer())
        .get(`/api/orders/${randomUUID()}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });

    it('lets the owning buyer see the consolidated order, rejects a stranger', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      const { token: sellerToken } = await becomeApprovedSeller();
      const { orderId } = await paidOrder(buyerToken, sellerToken);

      const own = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);
      expect(own.body.id).toBe(orderId);
      expect(own.body.subOrders).toHaveLength(1);
      expect(own.body.subOrders[0].items).toHaveLength(1);

      const strangerToken = await registerAndLogin(
        `stranger-${randomUUID()}@example.com`,
      );
      await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${strangerToken}`)
        .expect(403);

      await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /sellers/:id/orders', () => {
    it('lets the owning seller list their sub-orders, rejects another seller', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      const { token: sellerToken, sellerId } = await becomeApprovedSeller();
      const { subOrderId } = await paidOrder(buyerToken, sellerToken);

      const own = await request(app.getHttpServer())
        .get(`/api/sellers/${sellerId}/orders`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);
      expect(own.body.some((so: { id: string }) => so.id === subOrderId)).toBe(
        true,
      );

      const { token: otherSellerToken } = await becomeApprovedSeller();
      await request(app.getHttpServer())
        .get(`/api/sellers/${sellerId}/orders`)
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .expect(403);
    });

    it('404s for an unknown seller', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      await request(app.getHttpServer())
        .get(`/api/sellers/${randomUUID()}/orders`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });
  });

  describe('PATCH /suborders/:id/status', () => {
    it('rejects an invalid transition (skipping a step)', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      const { token: sellerToken } = await becomeApprovedSeller();
      const { subOrderId } = await paidOrder(buyerToken, sellerToken);

      // still 'paid' — jumping straight to 'delivered' skips 'shipped'
      await request(app.getHttpServer())
        .patch(`/api/suborders/${subOrderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'delivered' })
        .expect(409);
    });

    it('rejects a seller who does not own the sub-order', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      const { token: sellerToken } = await becomeApprovedSeller();
      const { token: otherSellerToken } = await becomeApprovedSeller();
      const { subOrderId } = await paidOrder(buyerToken, sellerToken);
      await shipSubOrder(sellerToken, subOrderId);

      await request(app.getHttpServer())
        .patch(`/api/suborders/${subOrderId}/status`)
        .set('Authorization', `Bearer ${otherSellerToken}`)
        .send({ status: 'delivered' })
        .expect(403);
    });

    it('lets the owning seller mark shipped -> delivered', async () => {
      const buyerToken = await registerAndLogin(
        `buyer-${randomUUID()}@example.com`,
      );
      const { token: sellerToken } = await becomeApprovedSeller();
      const { subOrderId } = await paidOrder(buyerToken, sellerToken);
      await shipSubOrder(sellerToken, subOrderId);

      const result = await request(app.getHttpServer())
        .patch(`/api/suborders/${subOrderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'delivered' })
        .expect(200);
      expect(result.body.status).toBe('delivered');

      // delivered is terminal — no further transition is legal
      await request(app.getHttpServer())
        .patch(`/api/suborders/${subOrderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'delivered' })
        .expect(409);
    });
  });
});
