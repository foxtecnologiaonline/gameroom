import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from '../orders/orders.service';
import { SubOrderStatus } from '../orders/sub-order-status.enum';
import { SellersService } from '../seller/sellers.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewEntity } from './entities/review.entity';

export interface RequestingUser {
  id: string;
  roles: string[];
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ReviewEntity)
    private readonly reviews: Repository<ReviewEntity>,
    private readonly orders: OrdersService,
    private readonly sellers: SellersService,
  ) {}

  async create(
    requester: RequestingUser,
    dto: CreateReviewDto,
  ): Promise<ReviewEntity> {
    const subOrder = await this.orders.findSubOrderById(dto.subOrderId);
    if (!subOrder) {
      throw new NotFoundException('SubOrder não encontrado');
    }

    const order = await this.orders.findById(subOrder.orderId);
    if (!order || order.buyerId !== requester.id) {
      throw new ForbiddenException(
        'Você só pode avaliar os seus próprios pedidos',
      );
    }

    if (subOrder.status !== SubOrderStatus.Delivered) {
      throw new ConflictException(
        'Só é possível avaliar um sub-order depois de entregue',
      );
    }

    const existing = await this.reviews.findOne({
      where: { subOrderId: dto.subOrderId },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma avaliação para este sub-order',
      );
    }

    return this.reviews.save(
      this.reviews.create({
        subOrderId: dto.subOrderId,
        buyerId: requester.id,
        sellerId: subOrder.sellerId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );
  }

  async findBySeller(sellerId: string): Promise<ReviewEntity[]> {
    const seller = await this.sellers.findById(sellerId);
    if (!seller) {
      throw new NotFoundException('Seller não encontrado');
    }

    return this.reviews.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });
  }
}
