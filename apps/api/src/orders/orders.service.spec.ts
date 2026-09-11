import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { SUB_ORDER_STATUS_CHANGED } from './events/sub-order-status-changed.event';
import { OrdersService } from './orders.service';
import { SubOrderStatus } from './sub-order-status.enum';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: { findOne: jest.Mock };
  let subOrdersRepo: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock };
  let orderItemsRepo: { find: jest.Mock };
  let events: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(async () => {
    ordersRepo = { findOne: jest.fn() };
    subOrdersRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
    orderItemsRepo = { find: jest.fn() };
    events = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getDataSourceToken(), useValue: {} },
        { provide: getRepositoryToken(OrderEntity), useValue: ordersRepo },
        {
          provide: getRepositoryToken(SubOrderEntity),
          useValue: subOrdersRepo,
        },
        {
          provide: getRepositoryToken(OrderItemEntity),
          useValue: orderItemsRepo,
        },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(OrdersService);
  });

  describe('findById', () => {
    it('returns null for an unknown order', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      expect(await service.findById('missing')).toBeNull();
    });

    it('assembles the order with its sub-orders and items', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
      });
      subOrdersRepo.find.mockResolvedValue([
        { id: 'sub-1', orderId: 'order-1' },
      ]);
      orderItemsRepo.find.mockResolvedValue([
        { id: 'item-1', subOrderId: 'sub-1' },
      ]);

      const result = await service.findById('order-1');

      expect(result?.subOrders).toHaveLength(1);
      expect(result?.subOrders[0].items).toHaveLength(1);
    });
  });

  describe('updateSubOrderStatus', () => {
    it('404s for an unknown sub-order', async () => {
      subOrdersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateSubOrderStatus('missing', SubOrderStatus.Paid),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(events.emit).not.toHaveBeenCalled();
    });

    it('persists the new status and emits the domain event', async () => {
      const subOrder = {
        id: 'sub-1',
        orderId: 'order-1',
        sellerId: 'seller-1',
        status: SubOrderStatus.Pending,
      };
      subOrdersRepo.findOne.mockResolvedValue(subOrder);
      subOrdersRepo.save.mockImplementation(async (s) => s);

      const result = await service.updateSubOrderStatus(
        'sub-1',
        SubOrderStatus.Paid,
      );

      expect(result.status).toBe(SubOrderStatus.Paid);
      expect(events.emit).toHaveBeenCalledWith(
        SUB_ORDER_STATUS_CHANGED,
        expect.objectContaining({
          subOrderId: 'sub-1',
          orderId: 'order-1',
          sellerId: 'seller-1',
          previousStatus: SubOrderStatus.Pending,
          newStatus: SubOrderStatus.Paid,
        }),
      );
    });
  });
});
