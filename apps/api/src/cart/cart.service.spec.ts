import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OfferEntity } from '../catalog/entities/offer.entity';
import { OffersService } from '../catalog/offers.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity } from './entities/cart.entity';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let cartsRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let itemsRepo: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let offers: jest.Mocked<Pick<OffersService, 'findById'>>;

  const cart = {
    id: 'cart-1',
    buyerId: 'buyer-1',
    createdAt: new Date(),
  } as CartEntity;
  const offer = { id: 'offer-1', priceCents: 1000 } as OfferEntity;

  beforeEach(async () => {
    cartsRepo = {
      findOne: jest.fn().mockResolvedValue(cart),
      create: jest.fn((data) => ({ id: 'cart-1', ...data })),
      save: jest.fn(async (c) => c),
    };
    itemsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => ({
        id: 'item-1',
        createdAt: new Date(),
        ...data,
      })),
      save: jest.fn(async (i) => i),
      delete: jest.fn(),
    };
    offers = { findById: jest.fn().mockResolvedValue(offer) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: getRepositoryToken(CartEntity), useValue: cartsRepo },
        { provide: getRepositoryToken(CartItemEntity), useValue: itemsRepo },
        { provide: OffersService, useValue: offers },
      ],
    }).compile();

    service = module.get(CartService);
  });

  describe('addItem', () => {
    it('404s for an unknown offer', async () => {
      offers.findById.mockResolvedValue(null);

      await expect(
        service.addItem('buyer-1', 'missing', 1),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('creates a new line for a first-time offer', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      const result = await service.addItem('buyer-1', 'offer-1', 2);

      expect(itemsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cartId: 'cart-1',
          offerId: 'offer-1',
          quantity: 2,
        }),
      );
      expect(result.quantity).toBe(2);
    });

    it('increments the quantity when the offer is already in the cart', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
        offerId: 'offer-1',
        quantity: 3,
      } as CartItemEntity);

      const result = await service.addItem('buyer-1', 'offer-1', 2);

      expect(itemsRepo.create).not.toHaveBeenCalled();
      expect(result.quantity).toBe(5);
    });
  });

  describe('getCart', () => {
    it('returns the cart with each item enriched with its offer', async () => {
      itemsRepo.find.mockResolvedValue([
        {
          id: 'item-1',
          cartId: 'cart-1',
          offerId: 'offer-1',
          quantity: 2,
        } as CartItemEntity,
      ]);

      const result = await service.getCart('buyer-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].offer).toEqual(offer);
    });

    it('returns an empty item list for a fresh cart', async () => {
      itemsRepo.find.mockResolvedValue([]);

      const result = await service.getCart('buyer-1');

      expect(result.items).toEqual([]);
    });
  });

  describe('removeItem', () => {
    it('404s for an unknown item', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem('buyer-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects removing an item from someone else’s cart', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: 'item-1',
        cartId: 'another-cart',
      } as CartItemEntity);

      await expect(
        service.removeItem('buyer-1', 'item-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(itemsRepo.delete).not.toHaveBeenCalled();
    });

    it('deletes the item on the happy path', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: 'item-1',
        cartId: 'cart-1',
      } as CartItemEntity);

      await service.removeItem('buyer-1', 'item-1');

      expect(itemsRepo.delete).toHaveBeenCalledWith('item-1');
    });
  });
});
