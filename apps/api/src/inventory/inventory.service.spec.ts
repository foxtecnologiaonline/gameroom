import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OfferEntity } from '../catalog/entities/offer.entity';
import { OffersService } from '../catalog/offers.service';
import { Role } from '../identity/role.enum';
import { SellerEntity } from '../seller/entities/seller.entity';
import { SellersService } from '../seller/sellers.service';
import { ReservationEntity } from './entities/reservation.entity';
import { InventoryService } from './inventory.service';
import { ReservationStatus } from './reservation-status.enum';

describe('InventoryService', () => {
  let service: InventoryService;
  let reservationsRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let offers: jest.Mocked<
    Pick<
      OffersService,
      'reserveStock' | 'releaseStock' | 'setStock' | 'findById'
    >
  >;
  let sellers: jest.Mocked<Pick<SellersService, 'findApprovedByUserId'>>;

  const buildReservation = (
    overrides: Partial<ReservationEntity> = {},
  ): ReservationEntity =>
    ({
      id: 'reservation-1',
      offerId: 'offer-1',
      quantity: 2,
      status: ReservationStatus.Active,
      createdAt: new Date(),
      releasedAt: null,
      ...overrides,
    }) as ReservationEntity;

  beforeEach(async () => {
    reservationsRepo = {
      create: jest.fn((data) => ({ id: 'reservation-1', ...data })),
      save: jest.fn(async (r) => r),
      findOne: jest.fn(),
    };
    offers = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
      setStock: jest.fn(),
      findById: jest.fn(),
    };
    sellers = { findApprovedByUserId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: getRepositoryToken(ReservationEntity),
          useValue: reservationsRepo,
        },
        { provide: OffersService, useValue: offers },
        { provide: SellersService, useValue: sellers },
      ],
    }).compile();

    service = module.get(InventoryService);
  });

  describe('reserve', () => {
    it('reserves stock and records the reservation on the happy path', async () => {
      const result = await service.reserve('offer-1', 2);

      expect(offers.reserveStock).toHaveBeenCalledWith('offer-1', 2);
      expect(reservationsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          offerId: 'offer-1',
          quantity: 2,
          status: ReservationStatus.Active,
        }),
      );
      expect(result.status).toBe(ReservationStatus.Active);
    });

    it('propagates insufficient-stock errors without creating a reservation', async () => {
      offers.reserveStock.mockRejectedValue(
        new ConflictException('sem estoque'),
      );

      await expect(service.reserve('offer-1', 99)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(reservationsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('release', () => {
    it('releases an active reservation and returns the stock', async () => {
      reservationsRepo.findOne.mockResolvedValue(buildReservation());

      const result = await service.release('offer-1', 'reservation-1');

      expect(offers.releaseStock).toHaveBeenCalledWith('offer-1', 2);
      expect(result.status).toBe(ReservationStatus.Released);
      expect(result.releasedAt).toBeInstanceOf(Date);
    });

    it('404s for a reservation that does not belong to the given offer', async () => {
      reservationsRepo.findOne.mockResolvedValue(
        buildReservation({ offerId: 'other-offer' }),
      );

      await expect(
        service.release('offer-1', 'reservation-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(offers.releaseStock).not.toHaveBeenCalled();
    });

    it('404s for an unknown reservation', async () => {
      reservationsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.release('offer-1', 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects releasing a reservation twice', async () => {
      reservationsRepo.findOne.mockResolvedValue(
        buildReservation({ status: ReservationStatus.Released }),
      );

      await expect(
        service.release('offer-1', 'reservation-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(offers.releaseStock).not.toHaveBeenCalled();
    });
  });

  describe('updateStock', () => {
    const offer = { id: 'offer-1', sellerId: 'seller-1' } as OfferEntity;

    it('lets an admin update stock on any offer', async () => {
      offers.findById.mockResolvedValue(offer);
      offers.setStock.mockResolvedValue({ ...offer, stock: 10 } as OfferEntity);

      await service.updateStock(
        'offer-1',
        { id: 'admin-1', roles: [Role.Admin] },
        10,
      );

      expect(sellers.findApprovedByUserId).not.toHaveBeenCalled();
      expect(offers.setStock).toHaveBeenCalledWith('offer-1', 10);
    });

    it('lets the owning seller update their own offer', async () => {
      offers.findById.mockResolvedValue(offer);
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'seller-1',
      } as SellerEntity);
      offers.setStock.mockResolvedValue({ ...offer, stock: 10 } as OfferEntity);

      await service.updateStock(
        'offer-1',
        { id: 'user-1', roles: [Role.Seller] },
        10,
      );

      expect(offers.setStock).toHaveBeenCalledWith('offer-1', 10);
    });

    it('rejects a seller trying to update someone else’s offer', async () => {
      offers.findById.mockResolvedValue(offer);
      sellers.findApprovedByUserId.mockResolvedValue({
        id: 'another-seller',
      } as SellerEntity);

      await expect(
        service.updateStock(
          'offer-1',
          { id: 'user-1', roles: [Role.Seller] },
          10,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(offers.setStock).not.toHaveBeenCalled();
    });

    it('404s for an unknown offer', async () => {
      offers.findById.mockResolvedValue(null);

      await expect(
        service.updateStock(
          'missing',
          { id: 'user-1', roles: [Role.Admin] },
          10,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
