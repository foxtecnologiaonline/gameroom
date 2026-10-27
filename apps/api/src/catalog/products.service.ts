import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';

export interface ProductWithOffers extends ProductEntity {
  offers: OfferEntity[];
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(ProductEntity)
    private readonly products: Repository<ProductEntity>,
    @InjectRepository(OfferEntity)
    private readonly offers: Repository<OfferEntity>,
  ) {}

  create(dto: CreateProductDto): Promise<ProductEntity> {
    const product = this.products.create({
      title: dto.title,
      description: dto.description,
      categoryId: dto.categoryId,
      brand: dto.brand ?? null,
      attributes: dto.attributes ?? {},
    });
    return this.products.save(product);
  }

  /** Public product page — a suspended (moderated) product is a 404 for everyone. */
  async findByIdWithOffers(id: string): Promise<ProductWithOffers> {
    const product = await this.products.findOne({
      where: { id, suspendedAt: IsNull() },
    });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const offers = await this.offers.find({
      where: { productId: id },
      order: { priceCents: 'ASC' },
    });

    return { ...product, offers };
  }

  /** Public search — excludes suspended (moderated) products. */
  search(query?: string): Promise<ProductEntity[]> {
    if (!query) {
      return this.products.find({
        where: { suspendedAt: IsNull() },
        order: { createdAt: 'DESC' },
        take: 50,
      });
    }

    return this.products.find({
      where: { title: ILike(`%${query}%`), suspendedAt: IsNull() },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  /** GET /products/admin — moderation queue, includes suspended products. */
  findAllForAdmin(): Promise<ProductEntity[]> {
    return this.products.find({ order: { createdAt: 'DESC' } });
  }

  async setSuspended(id: string, suspended: boolean): Promise<ProductEntity> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    product.suspendedAt = suspended ? new Date() : null;
    return this.products.save(product);
  }
}
