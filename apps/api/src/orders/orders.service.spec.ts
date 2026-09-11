import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../identity/role.enum';
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellersService } from '../seller/sellers.service';
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
  let sellers: jest.Mocked<
    Pick<SellersService, 'findByIdForRequester' | 'findApprovedByUserId'>
  >;

  beforeEach(async () => {
    ordersRepo = { findOne: jest.fn() };
    subOrdersRepo = { findOne: jest.fn(), find: jest.fn(), save: jest.fn() };
    orderItemsRepo = { find: jest.fn() };
    events = { emit: jest.fn() };
    sellers = {
      findByIdForRequester: jest.fn(),
      findApprovedByUserId: jest.fn(),
    };

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
        { provide: SellersService, useValue: sellers },
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

  describe('findByIdForRequester', () => {
    it('404s for an unknown order', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdForRequester('missing', { id: 'buyer-1', roles: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a requester who is neither the buyer nor an admin', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
      });
      subOrdersRepo.find.mockResolvedValue([]);

      await expect(
        service.findByIdForRequester('order-1', {
          id: 'someone-else',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets the owning buyer see the order', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
      });
      subOrdersRepo.find.mockResolvedValue([]);

      const result = await service.findByIdForRequester('order-1', {
        id: 'buyer-1',
        roles: [],
      });
      expect(result.id).toBe('order-1');
    });

    it('lets an admin see any order', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: 'order-1',
        buyerId: 'buyer-1',
      });
      subOrdersRepo.find.mockResolvedValue([]);

      const result = await service.findByIdForRequester('order-1', {
        id: 'admin-1',
        roles: [Role.Admin],
      });
      expect(result.id).toBe('order-1');
    });
  });

  describe('findSubOrdersForSeller', () => {
    it('propagates the 403/404 from SellersService.findByIdForRequester', async () => {
      sellers.findByIdForRequester.mockRejectedValue(new ForbiddenException());

      await expect(
        service.findSubOrdersForSeller('seller-1', {
          id: 'user-1',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(subOrdersRepo.find).not.toHaveBeenCalled();
    });

    it('lists the seller’s sub-orders with items once authorized', async () => {
      sellers.findByIdForRequester.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);
      subOrdersRepo.find.mockResolvedValue([
        { id: 'sub-1', sellerId: 'seller-1' },
      ]);
      orderItemsRepo.find.mockResolvedValue([
        { id: 'item-1', subOrderId: 'sub-1' },
      ]);

      const result = await service.findSubOrdersForSeller('seller-1', {
        id: 'user-1',
        roles: [],
      });

      expect(result).toHaveLength(1);
      expect(result[0].items).toHaveLength(1);
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

  describe('transitionSubOrderStatus', () => {
    const subOrder = (overrides: Partial<SubOrderEntity> = {}) =>
      ({
        id: 'sub-1',
        orderId: 'order-1',
        sellerId: 'seller-1',
        status: SubOrderStatus.Shipped,
        ...overrides,
      }) as SubOrderEntity;

    it('404s for an unknown sub-order', async () => {
      subOrdersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.transitionSubOrderStatus('missing', SubOrderStatus.Delivered, {
          id: 'user-1',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a seller trying to change someone else’s sub-order', async () => {
      subOrdersRepo.findOne.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'another-seller',
      } as SellerEntity);

      await expect(
        service.transitionSubOrderStatus('sub-1', SubOrderStatus.Delivered, {
          id: 'user-1',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an invalid transition (skipping a step)', async () => {
      subOrdersRepo.findOne.mockResolvedValue(
        subOrder({ status: SubOrderStatus.Pending }),
      );
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);

      await expect(
        service.transitionSubOrderStatus('sub-1', SubOrderStatus.Delivered, {
          id: 'user-1',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a transition from a terminal status', async () => {
      subOrdersRepo.findOne.mockResolvedValue(
        subOrder({ status: SubOrderStatus.Delivered }),
      );
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);

      await expect(
        service.transitionSubOrderStatus('sub-1', SubOrderStatus.Delivered, {
          id: 'user-1',
          roles: [],
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('lets the owning seller move shipped -> delivered', async () => {
      subOrdersRepo.findOne.mockResolvedValue(subOrder());
      subOrdersRepo.save.mockImplementation(async (s) => s);
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);

      const result = await service.transitionSubOrderStatus(
        'sub-1',
        SubOrderStatus.Delivered,
        { id: 'user-1', roles: [] },
      );

      expect(result.status).toBe(SubOrderStatus.Delivered);
      expect(events.emit).toHaveBeenCalled();
    });

    it('lets an admin move the transition without owning the seller', async () => {
      subOrdersRepo.findOne.mockResolvedValue(subOrder());
      subOrdersRepo.save.mockImplementation(async (s) => s);

      const result = await service.transitionSubOrderStatus(
        'sub-1',
        SubOrderStatus.Delivered,
        { id: 'admin-1', roles: [Role.Admin] },
      );

      expect(result.status).toBe(SubOrderStatus.Delivered);
      expect(sellers.findApprovedByUserId).not.toHaveBeenCalled();
    });
  });
});
