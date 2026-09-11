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
