import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellerStatus } from '../seller/seller-status.enum';
import { SellersService } from '../seller/sellers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferCondition } from './offer-condition.enum';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';
import { OffersService } from './offers.service';

describe('OffersService', () => {
  let service: OffersService;
  let productsRepo: { findOne: jest.Mock };
  let offersRepo: {
    store: OfferEntity[];
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneOrFail: jest.Mock;
    update: jest.Mock;
  };
  let sellers: jest.Mocked<Pick<SellersService, 'findApprovedByUserId'>>;

  const dto = (priceCents: number, stock = 5): CreateOfferDto => ({
    priceCents,
    stock,
    condition: OfferCondition.New,
    slaDays: 3,
  });

  const seller = {
    id: 'seller-1',
    status: SellerStatus.Approved,
  } as SellerEntity;
  const product = { id: 'product-1' } as ProductEntity;

  beforeEach(async () => {
    let nextId = 1;
    const store: OfferEntity[] = [];

    productsRepo = { findOne: jest.fn().mockResolvedValue(product) };
    offersRepo = {
      store,
      create: jest.fn((data) => ({
        id: `offer-${nextId++}`,
        isBuyboxWinner: false,
        ...data,
      })),
      save: jest.fn(async (offer) => {
        store.push(offer);
        return offer;
      }),
      find: jest.fn(async ({ where: { productId } }) =>
        store.filter((o) => o.productId === productId),
      ),
      findOneOrFail: jest.fn(async ({ where: { id } }) =>
        store.find((o) => o.id === id),
      ),
      update: jest.fn(async (id, patch) => {
        const offer = store.find((o) => o.id === id);
        Object.assign(offer, patch);
      }),
    };
    sellers = { findApprovedByUserId: jest.fn().mockResolvedValue(seller) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: getRepositoryToken(ProductEntity), useValue: productsRepo },
        { provide: getRepositoryToken(OfferEntity), useValue: offersRepo },
        { provide: SellersService, useValue: sellers },
      ],
    }).compile();

    service = module.get(OffersService);
  });

  it('makes the single offer the buybox winner on the happy path', async () => {
    const offer = await service.create('product-1', 'user-1', dto(1000));

    expect(offer.isBuyboxWinner).toBe(true);
  });

  it('moves the buybox to whichever offer becomes the cheapest with stock', async () => {
    await service.create('product-1', 'user-1', dto(1000));
    const cheaper = await service.create('product-1', 'user-1', dto(500));

    expect(cheaper.isBuyboxWinner).toBe(true);
    const [first] = offersRepo.store;
    expect(first.isBuyboxWinner).toBe(false);
  });

  it('never gives the buybox to an offer with no stock', async () => {
    const outOfStock = await service.create('product-1', 'user-1', dto(100, 0));
    const inStock = await service.create('product-1', 'user-1', dto(999, 1));

    expect(outOfStock.isBuyboxWinner).toBe(false);
    expect(inStock.isBuyboxWinner).toBe(true);
  });

  it('rejects a requester with no approved seller profile', async () => {
    sellers.findApprovedByUserId.mockResolvedValue(null);

    await expect(
      service.create('product-1', 'user-1', dto(1000)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('404s for an unknown product', async () => {
    productsRepo.findOne.mockResolvedValue(null);

    await expect(
      service.create('missing', 'user-1', dto(1000)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
