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
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellersService } from '../seller/sellers.service';
import { ReviewEntity } from './entities/review.entity';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewsRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };
  let orders: jest.Mocked<Pick<OrdersService, 'findSubOrderById' | 'findById'>>;
  let sellers: jest.Mocked<Pick<SellersService, 'findById'>>;

  const subOrder = (overrides: Partial<SubOrderEntity> = {}): SubOrderEntity =>
    ({
      id: 'sub-1',
      orderId: 'order-1',
      sellerId: 'seller-1',
      status: SubOrderStatus.Delivered,
      ...overrides,
    }) as SubOrderEntity;

  beforeEach(async () => {
    reviewsRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => ({ id: 'review-1', ...data })),
      save: jest.fn(async (r) => r),
      find: jest.fn(),
    };
    orders = { findSubOrderById: jest.fn(), findById: jest.fn() };
    sellers = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getRepositoryToken(ReviewEntity), useValue: reviewsRepo },
        { provide: OrdersService, useValue: orders },
        { provide: SellersService, useValue: sellers },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('create', () => {
    const dto = { subOrderId: 'sub-1', rating: 5, comment: 'ótimo' };

    it('404s for an unknown sub-order', async () => {
      orders.findSubOrderById.mockResolvedValue(null);

      await expect(
        service.create({ id: 'buyer-1', roles: [] }, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a requester who is not the buyer of the order', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      orders.findById.mockResolvedValue({
        buyerId: 'someone-else',
      } as OrderWithSubOrders);

      await expect(
        service.create({ id: 'buyer-1', roles: [] }, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects reviewing a sub-order that has not been delivered yet', async () => {
      orders.findSubOrderById.mockResolvedValue(
        subOrder({ status: SubOrderStatus.Shipped }),
      );
      orders.findById.mockResolvedValue({
        buyerId: 'buyer-1',
      } as OrderWithSubOrders);

      await expect(
        service.create({ id: 'buyer-1', roles: [] }, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a second review for the same sub-order', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      orders.findById.mockResolvedValue({
        buyerId: 'buyer-1',
      } as OrderWithSubOrders);
      reviewsRepo.findOne.mockResolvedValue({ id: 'existing-review' });

      await expect(
        service.create({ id: 'buyer-1', roles: [] }, dto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the review once delivered and unreviewed', async () => {
      orders.findSubOrderById.mockResolvedValue(subOrder());
      orders.findById.mockResolvedValue({
        buyerId: 'buyer-1',
      } as OrderWithSubOrders);

      const review = await service.create({ id: 'buyer-1', roles: [] }, dto);

      expect(review.sellerId).toBe('seller-1');
      expect(review.buyerId).toBe('buyer-1');
      expect(review.rating).toBe(5);
    });
  });

  describe('findBySeller', () => {
    it('404s for an unknown seller', async () => {
      sellers.findById.mockResolvedValue(null);

      await expect(service.findBySeller('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('lists the reviews for an existing seller', async () => {
      sellers.findById.mockResolvedValue({ id: 'seller-1' } as SellerEntity);
      reviewsRepo.find.mockResolvedValue([
        { id: 'review-1', sellerId: 'seller-1', rating: 5 },
      ]);

      const result = await service.findBySeller('seller-1');
      expect(result).toHaveLength(1);
    });
  });
});
