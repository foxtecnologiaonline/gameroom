import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SellersService } from '../seller/sellers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';

@Injectable()
export class OffersService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(OfferEntity)
    private readonly offers: Repository<OfferEntity>,
    private readonly sellers: SellersService,
  ) {}

  async create(
    productId: string,
    requesterId: string,
    dto: CreateOfferDto,
  ): Promise<OfferEntity> {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const seller = await this.sellers.findApprovedByUserId(requesterId);
    if (!seller) {
      throw new ForbiddenException(
        'É necessário ser um seller aprovado para criar ofertas',
      );
    }

    const offer = this.offers.create({
      productId,
      sellerId: seller.id,
      priceCents: dto.priceCents,
      stock: dto.stock,
      condition: dto.condition,
      slaDays: dto.slaDays,
      isBuyboxWinner: false,
    });
    await this.offers.save(offer);

    await this.recalculateBuybox(productId);
    return this.offers.findOneOrFail({ where: { id: offer.id } });
  }

  /**
   * Buybox winner = lowest price among offers with stock. Recomputed on
   * every offer write so it never drifts from the current price/stock.
   */
  private async recalculateBuybox(productId: string): Promise<void> {
    const offers = await this.offers.find({ where: { productId } });
    const eligible = offers.filter((o) => o.stock > 0);
    const winner = eligible.sort((a, b) => a.priceCents - b.priceCents)[0];

    await Promise.all(
      offers.map((offer) =>
        this.offers.update(offer.id, {
          isBuyboxWinner: offer.id === winner?.id,
        }),
      ),
    );
  }
}
