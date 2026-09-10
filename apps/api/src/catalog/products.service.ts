import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
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

  async findByIdWithOffers(id: string): Promise<ProductWithOffers> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    const offers = await this.offers.find({
      where: { productId: id },
      order: { priceCents: 'ASC' },
    });

    return { ...product, offers };
  }

  search(query?: string): Promise<ProductEntity[]> {
    if (!query) {
      return this.products.find({ order: { createdAt: 'DESC' }, take: 50 });
    }

    return this.products.find({
      where: { title: ILike(`%${query}%`) },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
