import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../identity/role.enum';
import { UsersService } from '../identity/users.service';
import { SellerEntity } from './entities/seller.entity';
import { RECIPIENT_GATEWAY } from './gateways/recipient.gateway';
import { SellerStatus } from './seller-status.enum';
import { SellersService } from './sellers.service';

describe('SellersService', () => {
  let service: SellersService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let users: jest.Mocked<Pick<UsersService, 'addRole'>>;
  let recipientGateway: { createRecipient: jest.Mock };

  const buildSeller = (overrides: Partial<SellerEntity> = {}): SellerEntity =>
    ({
      id: 'seller-1',
      userId: 'user-1',
      storeName: 'Loja do Zé',
      document: '12345678900',
      status: SellerStatus.Pending,
      recipientId: null,
      createdAt: new Date(),
      approvedAt: null,
      ...overrides,
    }) as SellerEntity;

  beforeEach(async () => {
    repo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    users = { addRole: jest.fn() };
    recipientGateway = { createRecipient: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SellersService,
        { provide: getRepositoryToken(SellerEntity), useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: RECIPIENT_GATEWAY, useValue: recipientGateway },
      ],
    }).compile();

    service = module.get(SellersService);
  });

  describe('apply', () => {
    it('creates a pending seller profile on the happy path', async () => {
      repo.findOne.mockResolvedValue(null);
      const created = buildSeller();
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.apply('user-1', {
        storeName: 'Loja do Zé',
        document: '12345678900',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          status: SellerStatus.Pending,
        }),
      );
      expect(result).toEqual(created);
    });

    it('rejects a second application from the same user', async () => {
      repo.findOne.mockResolvedValue(buildSeller());

      await expect(
        service.apply('user-1', {
          storeName: 'Outra loja',
          document: '12345678900',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForRequester', () => {
    it('returns the seller to its owner', async () => {
      const seller = buildSeller();
      repo.findOne.mockResolvedValue(seller);

      const result = await service.findByIdForRequester('seller-1', {
        id: 'user-1',
        roles: [Role.Buyer],
      });

      expect(result).toEqual(seller);
    });

    it('returns the seller to an admin', async () => {
      const seller = buildSeller();
      repo.findOne.mockResolvedValue(seller);

      const result = await service.findByIdForRequester('seller-1', {
        id: 'someone-else',
        roles: [Role.Admin],
      });

      expect(result).toEqual(seller);
    });

    it('rejects a stranger', async () => {
      repo.findOne.mockResolvedValue(buildSeller());

      await expect(
        service.findByIdForRequester('seller-1', {
          id: 'someone-else',
          roles: [Role.Buyer],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s for an unknown seller', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdForRequester('missing', {
          id: 'user-1',
          roles: [Role.Buyer],
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('approving a seller registers a recipient and grants the seller role', async () => {
      const seller = buildSeller();
      repo.findOne.mockResolvedValue(seller);
      repo.save.mockImplementation((s) => Promise.resolve(s));
      recipientGateway.createRecipient.mockResolvedValue({
        recipientId: 'recipient-123',
      });

      const result = await service.updateStatus('seller-1', {
        status: SellerStatus.Approved,
      });

      expect(recipientGateway.createRecipient).toHaveBeenCalledWith(seller);
      expect(users.addRole).toHaveBeenCalledWith('user-1', Role.Seller);
      expect(result.status).toBe(SellerStatus.Approved);
      expect(result.recipientId).toBe('recipient-123');
      expect(result.approvedAt).toBeInstanceOf(Date);
    });

    it('rejecting a seller does not touch the recipient gateway or roles', async () => {
      const seller = buildSeller();
      repo.findOne.mockResolvedValue(seller);
      repo.save.mockImplementation((s) => Promise.resolve(s));

      const result = await service.updateStatus('seller-1', {
        status: SellerStatus.Rejected,
      });

      expect(recipientGateway.createRecipient).not.toHaveBeenCalled();
      expect(users.addRole).not.toHaveBeenCalled();
      expect(result.status).toBe(SellerStatus.Rejected);
    });

    it('404s when the seller does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing', { status: SellerStatus.Approved }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
