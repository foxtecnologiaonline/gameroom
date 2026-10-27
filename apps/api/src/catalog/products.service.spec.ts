import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productsRepo: { find: jest.Mock; findOne: jest.Mock; save: jest.Mock };
  let offersRepo: { find: jest.Mock };

  beforeEach(async () => {
    productsRepo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn() };
    offersRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(ProductEntity), useValue: productsRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offersRepo },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  describe('findByIdWithOffers', () => {
    it('404s for a suspended product (moderated out of the public catalog)', async () => {
      productsRepo.findOne.mockResolvedValue(null);

      await expect(service.findByIdWithOffers('prod-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(productsRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'prod-1', suspendedAt: expect.anything() },
      });
    });

    it('returns the product with its offers when active', async () => {
      productsRepo.findOne.mockResolvedValue({ id: 'prod-1', title: 'X' });
      offersRepo.find.mockResolvedValue([{ id: 'offer-1' }]);

      const result = await service.findByIdWithOffers('prod-1');

      expect(result.offers).toHaveLength(1);
    });
  });

  describe('search', () => {
    it('excludes suspended products from the default listing', async () => {
      productsRepo.find.mockResolvedValue([]);

      await service.search();

      expect(productsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { suspendedAt: expect.anything() },
        }),
      );
    });

    it('excludes suspended products from a filtered search too', async () => {
      productsRepo.find.mockResolvedValue([]);

      await service.search('quest');

      expect(productsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ suspendedAt: expect.anything() }),
        }),
      );
    });
  });

  describe('findAllForAdmin', () => {
    it('lists every product regardless of moderation status', async () => {
      productsRepo.find.mockResolvedValue([{ id: 'prod-1' }]);

      const result = await service.findAllForAdmin();

      expect(productsRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('setSuspended', () => {
    it('404s for an unknown product', async () => {
      productsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setSuspended('missing', true),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('suspends an active product', async () => {
      productsRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        suspendedAt: null,
      });
      productsRepo.save.mockImplementation(async (p) => p);

      const result = await service.setSuspended('prod-1', true);

      expect(result.suspendedAt).toBeInstanceOf(Date);
    });

    it('reactivates a suspended product', async () => {
      productsRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        suspendedAt: new Date(),
      });
      productsRepo.save.mockImplementation(async (p) => p);

      const result = await service.setSuspended('prod-1', false);

      expect(result.suspendedAt).toBeNull();
    });
  });
});
