import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OrderWithSubOrders, OrdersService } from '../orders/orders.service';
import { SubOrderEntity } from '../orders/entities/sub-order.entity';
import { SubOrderStatus } from '../orders/sub-order-status.enum';
import { Role } from '../identity/role.enum';
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellersService } from '../seller/sellers.service';
import { ShipmentEntity } from './entities/shipment.entity';
import { SHIPPING_GATEWAY } from './gateways/shipping.gateway';
import { ShipmentStatus } from './shipment-status.enum';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let shipmentsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let orders: jest.Mocked<
    Pick<
      OrdersService,
      'findSubOrderById' | 'findById' | 'updateSubOrderStatus'
    >
  >;
  let sellers: jest.Mocked<Pick<SellersService, 'findApprovedByUserId'>>;
  let gateway: { quote: jest.Mock; createLabel: jest.Mock };

  const subOrder = (overrides: Partial<SubOrderEntity> = {}): SubOrderEntity =>
    ({
      id: 'sub-1',
      orderId: 'order-1',
      sellerId: 'seller-1',
      status: SubOrderStatus.Paid,
      ...overrides,
    }) as SubOrderEntity;

  beforeEach(async () => {
    shipmentsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 'shipment-1', ...data })),
      save: jest.fn(async (s) => s),
    };
    orders = {
      findSubOrderById: jest.fn(),
      findById: jest.fn(),
      updateSubOrderStatus: jest.fn(),
    };
    sellers = { findApprovedByUserId: jest.fn() };
    gateway = { quote: jest.fn(), createLabel: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: getRepositoryToken(ShipmentEntity),
          useValue: shipmentsRepo,
        },
        { provide: OrdersService, useValue: orders },
        { provide: SellersService, useValue: sellers },
        { provide: SHIPPING_GATEWAY, useValue: gateway },
      ],
    }).compile();

    service = module.get(ShippingService);
  });

  describe('quote', () => {
    it('delegates straight to the gateway', async () => {
      gateway.quote.mockResolvedValue([
        { carrier: 'correios-pac', priceCents: 900, etaDays: 7 },
      ]);

      const result = await service.quote({
        destinationZip: '01310-100',
        weightGrams: 500,
      });

      expect(gateway.quote).toHaveBeenCalledWith({
        destinationZip: '01310-100',
        weightGrams: 500,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('createLabel', () => {
    const dto = {
      subOrderId: 'sub-1',
      destinationZip: '01310-100',
      weightGrams: 500,
      carrier: 'correios-pac',
    };

    it('404s for an unknown sub-order', async () => {
      orders.findSubOrderById.mockResolvedValue(null);

      await expect(
        service.createLabel({ id: 'user-1', roles: [] }, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a seller trying to ship someone else’s sub-order', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'another-seller',
      } as SellerEntity);

      await expect(
        service.createLabel({ id: 'user-1', roles: [Role.Seller] }, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects generating a label before the sub-order is paid', async () => {
      orders.findSubOrderById.mockResolvedValue(
        subOrder({ status: SubOrderStatus.Pending }),
      );
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);

      await expect(
        service.createLabel({ id: 'user-1', roles: [Role.Seller] }, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a second label for the same sub-order', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);
      shipmentsRepo.findOne.mockResolvedValue({ id: 'existing-shipment' });

      await expect(
        service.createLabel({ id: 'user-1', roles: [Role.Seller] }, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the shipment and moves the sub-order to shipped', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);
      gateway.createLabel.mockResolvedValue({
        trackingCode: 'BR123',
        etaDays: 7,
      });

      const shipment = await service.createLabel(
        { id: 'user-1', roles: [Role.Seller] },
        dto,
      );

      expect(shipment.trackingCode).toBe('BR123');
      expect(shipment.status).toBe(ShipmentStatus.LabelCreated);
      expect(orders.updateSubOrderStatus).toHaveBeenCalledWith(
        'sub-1',
        SubOrderStatus.Shipped,
      );
    });
  });

  describe('getTracking', () => {
    it('404s for an unknown shipment', async () => {
      shipmentsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.getTracking('missing', { id: 'user-1', roles: [] }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets the owning seller see the tracking', async () => {
      shipmentsRepo.findOne.mockResolvedValue({
        id: 'shipment-1',
        subOrderId: 'sub-1',
      });
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);

      const result = await service.getTracking('shipment-1', {
        id: 'user-1',
        roles: [Role.Seller],
      });
      expect(result.id).toBe('shipment-1');
    });

    it('lets the buyer of the order see the tracking', async () => {
      shipmentsRepo.findOne.mockResolvedValue({
        id: 'shipment-1',
        subOrderId: 'sub-1',
      });
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue(null);
      orders.findById.mockResolvedValue({
        buyerId: 'buyer-1',
      } as OrderWithSubOrders);

      const result = await service.getTracking('shipment-1', {
        id: 'buyer-1',
        roles: [Role.Buyer],
      });
      expect(result.id).toBe('shipment-1');
    });

    it('rejects a stranger', async () => {
      shipmentsRepo.findOne.mockResolvedValue({
        id: 'shipment-1',
        subOrderId: 'sub-1',
      });
      orders.findSubOrderById.mockResolvedValue(subOrder());
      sellers.findApprovedByUserId.mockResolvedValue(null);
      orders.findById.mockResolvedValue({
        buyerId: 'someone-else',
      } as OrderWithSubOrders);

      await expect(
        service.getTracking('shipment-1', {
          id: 'user-1',
          roles: [Role.Buyer],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
