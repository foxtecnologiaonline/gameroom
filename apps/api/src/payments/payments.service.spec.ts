import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderWithSubOrders, OrdersService } from '../orders/orders.service';
import { SubOrderStatus } from '../orders/sub-order-status.enum';
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellersService } from '../seller/sellers.service';
import { PaymentEntity } from './entities/payment.entity';
import { SplitTransactionEntity } from './entities/split-transaction.entity';
import { PAYMENT_STATUS_CHANGED } from './events/payment-status-changed.event';
import { PAYMENT_GATEWAY } from './gateways/payment.gateway';
import { PaymentMethod } from './payment-method.enum';
import { PaymentStatus } from './payment-status.enum';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let splitsRepo: { find: jest.Mock; create: jest.Mock; save: jest.Mock };
  let orders: jest.Mocked<
    Pick<OrdersService, 'findById' | 'updateSubOrderStatus'>
  >;
  let sellers: jest.Mocked<Pick<SellersService, 'findById'>>;
  let events: jest.Mocked<Pick<EventEmitter2, 'emit'>>;
  let gateway: { charge: jest.Mock };

  const order = (
    overrides: Partial<OrderWithSubOrders> = {},
  ): OrderWithSubOrders =>
    ({
      id: 'order-1',
      buyerId: 'buyer-1',
      totalCents: 3000,
      status: 'pending',
      subOrders: [
        {
          id: 'sub-1',
          orderId: 'order-1',
          sellerId: 'seller-1',
          subtotalCents: 2000,
          shippingCents: 0,
          status: SubOrderStatus.Pending,
          items: [],
        },
        {
          id: 'sub-2',
          orderId: 'order-1',
          sellerId: 'seller-2',
          subtotalCents: 1000,
          shippingCents: 0,
          status: SubOrderStatus.Pending,
          items: [],
        },
      ],
      ...overrides,
    }) as unknown as OrderWithSubOrders;

  beforeEach(async () => {
    paymentsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 'payment-1', ...data })),
      save: jest.fn(async (p) => p),
    };
    splitsRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ id: 'split-1', ...data })),
      save: jest.fn(async (s) => s),
    };
    orders = { findById: jest.fn(), updateSubOrderStatus: jest.fn() };
    sellers = {
      findById: jest
        .fn()
        .mockResolvedValue({ recipientId: 'recipient-1' } as SellerEntity),
    };
    gateway = { charge: jest.fn() };
    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(PaymentEntity), useValue: paymentsRepo },
        {
          provide: getRepositoryToken(SplitTransactionEntity),
          useValue: splitsRepo,
        },
        { provide: OrdersService, useValue: orders },
        { provide: SellersService, useValue: sellers },
        { provide: EventEmitter2, useValue: events },
        { provide: PAYMENT_GATEWAY, useValue: gateway },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('charge', () => {
    it('404s for an unknown order', async () => {
      orders.findById.mockResolvedValue(null);

      await expect(
        service.charge('buyer-1', {
          orderId: 'missing',
          method: PaymentMethod.CreditCard,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects charging an order that belongs to someone else', async () => {
      orders.findById.mockResolvedValue(order({ buyerId: 'someone-else' }));

      await expect(
        service.charge('buyer-1', {
          orderId: 'order-1',
          method: PaymentMethod.CreditCard,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects charging an order that is not pending', async () => {
      orders.findById.mockResolvedValue(order({ status: 'paid' }));

      await expect(
        service.charge('buyer-1', {
          orderId: 'order-1',
          method: PaymentMethod.CreditCard,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a second charge attempt for the same order', async () => {
      orders.findById.mockResolvedValue(order());
      paymentsRepo.findOne.mockResolvedValue({ id: 'existing-payment' });

      await expect(
        service.charge('buyer-1', {
          orderId: 'order-1',
          method: PaymentMethod.CreditCard,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('settles a credit card charge synchronously and marks sub-orders paid', async () => {
      orders.findById.mockResolvedValue(order());
      gateway.charge.mockResolvedValue({
        gatewayId: 'gw-1',
        status: PaymentStatus.Paid,
      });

      const payment = await service.charge('buyer-1', {
        orderId: 'order-1',
        method: PaymentMethod.CreditCard,
      });

      expect(gateway.charge).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          splits: [
            {
              sellerId: 'seller-1',
              recipientId: 'recipient-1',
              amountCents: 2000,
            },
            {
              sellerId: 'seller-2',
              recipientId: 'recipient-1',
              amountCents: 1000,
            },
          ],
        }),
      );
      expect(payment.status).toBe(PaymentStatus.Paid);
      expect(splitsRepo.save).toHaveBeenCalled();
      expect(orders.updateSubOrderStatus).toHaveBeenCalledWith(
        'sub-1',
        SubOrderStatus.Paid,
      );
      expect(orders.updateSubOrderStatus).toHaveBeenCalledWith(
        'sub-2',
        SubOrderStatus.Paid,
      );
      expect(events.emit).toHaveBeenCalledWith(
        PAYMENT_STATUS_CHANGED,
        expect.objectContaining({
          paymentId: payment.id,
          previousStatus: null,
          newStatus: PaymentStatus.Paid,
        }),
      );
    });

    it('leaves sub-orders pending when a PIX charge is only pending confirmation', async () => {
      orders.findById.mockResolvedValue(order());
      gateway.charge.mockResolvedValue({
        gatewayId: 'gw-2',
        status: PaymentStatus.Pending,
      });

      const payment = await service.charge('buyer-1', {
        orderId: 'order-1',
        method: PaymentMethod.Pix,
      });

      expect(payment.status).toBe(PaymentStatus.Pending);
      expect(orders.updateSubOrderStatus).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhook', () => {
    it('404s for an unknown gatewayId', async () => {
      paymentsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.handleWebhook({
          gatewayId: 'missing',
          status: PaymentStatus.Paid,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is a no-op when the status already matches (idempotent replay)', async () => {
      paymentsRepo.findOne.mockResolvedValue({
        id: 'payment-1',
        gatewayId: 'gw-1',
        status: PaymentStatus.Paid,
      });

      const result = await service.handleWebhook({
        gatewayId: 'gw-1',
        status: PaymentStatus.Paid,
      });

      expect(result.status).toBe(PaymentStatus.Paid);
      expect(paymentsRepo.save).not.toHaveBeenCalled();
      expect(orders.updateSubOrderStatus).not.toHaveBeenCalled();
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('confirms a pending PIX payment and marks its sub-orders paid', async () => {
      paymentsRepo.findOne.mockResolvedValue({
        id: 'payment-1',
        orderId: 'order-1',
        gatewayId: 'gw-2',
        status: PaymentStatus.Pending,
      });
      splitsRepo.find.mockResolvedValue([
        { sellerId: 'seller-1', amountCents: 2000, feeCents: 0 },
        { sellerId: 'seller-2', amountCents: 1000, feeCents: 0 },
      ]);
      orders.findById.mockResolvedValue(order());

      const result = await service.handleWebhook({
        gatewayId: 'gw-2',
        status: PaymentStatus.Paid,
      });

      expect(result.status).toBe(PaymentStatus.Paid);
      expect(splitsRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: PaymentStatus.Paid }),
        ]),
      );
      expect(events.emit).toHaveBeenCalledWith(
        PAYMENT_STATUS_CHANGED,
        expect.objectContaining({
          paymentId: 'payment-1',
          previousStatus: PaymentStatus.Pending,
          newStatus: PaymentStatus.Paid,
        }),
      );
      expect(orders.updateSubOrderStatus).toHaveBeenCalledWith(
        'sub-1',
        SubOrderStatus.Paid,
      );
      expect(orders.updateSubOrderStatus).toHaveBeenCalledWith(
        'sub-2',
        SubOrderStatus.Paid,
      );
    });
  });
});
