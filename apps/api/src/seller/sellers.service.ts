import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../identity/role.enum';
import { UsersService } from '../identity/users.service';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { SellerEntity } from './entities/seller.entity';
import {
  RECIPIENT_GATEWAY,
  RecipientGateway,
} from './gateways/recipient.gateway';
import { SellerStatus } from './seller-status.enum';

export interface RequestingUser {
  id: string;
  roles: string[];
}

export interface SellerPublicView {
  id: string;
  storeName: string;
}

@Injectable()
export class SellersService {
  constructor(
    @InjectRepository(SellerEntity)
    private readonly sellers: Repository<SellerEntity>,
    private readonly users: UsersService,
    @Inject(RECIPIENT_GATEWAY)
    private readonly recipientGateway: RecipientGateway,
  ) {}

  async apply(userId: string, dto: CreateSellerDto): Promise<SellerEntity> {
    const existing = await this.sellers.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException(
        'Já existe um cadastro de seller para este usuário',
      );
    }

    const seller = this.sellers.create({
      userId,
      storeName: dto.storeName,
      document: dto.document,
      status: SellerStatus.Pending,
    });
    return this.sellers.save(seller);
  }

  async findByIdForRequester(
    id: string,
    requester: RequestingUser,
  ): Promise<SellerEntity> {
    const seller = await this.sellers.findOne({ where: { id } });
    if (!seller) {
      throw new NotFoundException('Seller não encontrado');
    }

    const isOwner = seller.userId === requester.id;
    const isAdmin = requester.roles.includes(Role.Admin);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Sem permissão para ver este seller');
    }

    return seller;
  }

  findById(id: string): Promise<SellerEntity | null> {
    return this.sellers.findOne({ where: { id } });
  }

  /**
   * Storefront needs the store name for every offer's seller, but
   * findByIdForRequester is owner/admin-only. This is the public-safe
   * slice (no document, recipientId, etc.) for anonymous product pages.
   */
  async findPublicById(id: string): Promise<SellerPublicView> {
    const seller = await this.sellers.findOne({ where: { id } });
    if (!seller) {
      throw new NotFoundException('Seller não encontrado');
    }

    return { id: seller.id, storeName: seller.storeName };
  }

  /**
   * GET /sellers/me — lets the storefront discover the logged-in user's
   * own seller record (and its id/status), which it has no other way to
   * find: findByIdForRequester needs a seller id the frontend doesn't
   * have yet, and findApprovedByUserId silently hides pending/rejected
   * applications.
   */
  async findMine(userId: string): Promise<SellerEntity> {
    const seller = await this.sellers.findOne({ where: { userId } });
    if (!seller) {
      throw new NotFoundException('Você ainda não se cadastrou como seller');
    }
    return seller;
  }

  /**
   * GET /sellers (admin-only) — the approval queue for the admin panel
   * (backlog item 14). Returns every seller regardless of status; the
   * client filters by status (e.g. pending) rather than this adding a
   * query-param surface for a single internal screen.
   */
  findAll(): Promise<SellerEntity[]> {
    return this.sellers.find({ order: { createdAt: 'ASC' } });
  }

  findApprovedByUserId(userId: string): Promise<SellerEntity | null> {
    return this.sellers.findOne({
      where: { userId, status: SellerStatus.Approved },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateSellerStatusDto,
  ): Promise<SellerEntity> {
    const seller = await this.sellers.findOne({ where: { id } });
    if (!seller) {
      throw new NotFoundException('Seller não encontrado');
    }

    seller.status = dto.status;

    if (dto.status === SellerStatus.Approved) {
      const { recipientId } =
        await this.recipientGateway.createRecipient(seller);
      seller.recipientId = recipientId;
      seller.approvedAt = new Date();
      await this.users.addRole(seller.userId, Role.Seller);
    }

    return this.sellers.save(seller);
  }
}
