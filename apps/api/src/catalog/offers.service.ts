import {
  ConflictException,
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

const MAX_STOCK_UPDATE_RETRIES = 5;

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

  findById(id: string): Promise<OfferEntity | null> {
    return this.offers.findOne({ where: { id } });
  }

  /**
   * Atomically decrements stock, guarded by an optimistic lock (`version`)
   * plus a `stock >= :quantity` guard so two concurrent reservations can
   * never oversell the same offer. Retries a few times on lost races
   * before giving up.
   */
  async reserveStock(offerId: string, quantity: number): Promise<void> {
    for (let attempt = 0; attempt < MAX_STOCK_UPDATE_RETRIES; attempt++) {
      const offer = await this.mustFind(offerId);
      if (offer.stock < quantity) {
        throw new ConflictException(
          'Estoque insuficiente para reservar a quantidade pedida',
        );
      }

      const result = await this.offers
        .createQueryBuilder()
        .update(OfferEntity)
        .set({
          stock: () => '"stock" - :quantity',
          version: () => '"version" + 1',
        })
        .where('id = :id AND version = :version AND stock >= :quantity', {
          id: offerId,
          version: offer.version,
          quantity,
        })
        .execute();

      if (result.affected === 1) {
        await this.recalculateBuybox(offer.productId);
        return;
      }
    }
    throw new ConflictException(
      'Alta concorrência nesta oferta, tente novamente',
    );
  }

  async releaseStock(offerId: string, quantity: number): Promise<void> {
    for (let attempt = 0; attempt < MAX_STOCK_UPDATE_RETRIES; attempt++) {
      const offer = await this.mustFind(offerId);

      const result = await this.offers
        .createQueryBuilder()
        .update(OfferEntity)
        .set({
          stock: () => '"stock" + :quantity',
          version: () => '"version" + 1',
        })
        .where('id = :id AND version = :version', {
          id: offerId,
          version: offer.version,
          quantity,
        })
        .execute();

      if (result.affected === 1) {
        await this.recalculateBuybox(offer.productId);
        return;
      }
    }
    throw new ConflictException(
      'Alta concorrência nesta oferta, tente novamente',
    );
  }

  async setStock(offerId: string, stock: number): Promise<OfferEntity> {
    for (let attempt = 0; attempt < MAX_STOCK_UPDATE_RETRIES; attempt++) {
      const offer = await this.mustFind(offerId);

      const result = await this.offers
        .createQueryBuilder()
        .update(OfferEntity)
        .set({ stock, version: () => '"version" + 1' })
        .where('id = :id AND version = :version', {
          id: offerId,
          version: offer.version,
        })
        .execute();

      if (result.affected === 1) {
        await this.recalculateBuybox(offer.productId);
        return this.offers.findOneOrFail({ where: { id: offerId } });
      }
    }
    throw new ConflictException(
      'Alta concorrência nesta oferta, tente novamente',
    );
  }

  private async mustFind(offerId: string): Promise<OfferEntity> {
    const offer = await this.offers.findOne({ where: { id: offerId } });
    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }
    return offer;
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
