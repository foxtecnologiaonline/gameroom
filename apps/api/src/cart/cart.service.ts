import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferEntity } from '../catalog/entities/offer.entity';
import { OffersService } from '../catalog/offers.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity } from './entities/cart.entity';

export interface CartItemView extends CartItemEntity {
  offer: OfferEntity;
}

export interface CartView extends CartEntity {
  items: CartItemView[];
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartEntity)
    private readonly carts: Repository<CartEntity>,
    @InjectRepository(CartItemEntity)
    private readonly items: Repository<CartItemEntity>,
    private readonly offers: OffersService,
  ) {}

  private async getOrCreateCart(buyerId: string): Promise<CartEntity> {
    const existing = await this.carts.findOne({ where: { buyerId } });
    if (existing) {
      return existing;
    }

    const cart = this.carts.create({ buyerId });
    return this.carts.save(cart);
  }

  async addItem(
    buyerId: string,
    offerId: string,
    quantity: number,
  ): Promise<CartItemEntity> {
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    const cart = await this.getOrCreateCart(buyerId);
    const existing = await this.items.findOne({
      where: { cartId: cart.id, offerId },
    });
    if (existing) {
      existing.quantity += quantity;
      return this.items.save(existing);
    }

    const item = this.items.create({ cartId: cart.id, offerId, quantity });
    return this.items.save(item);
  }

  async getCart(buyerId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(buyerId);
    const items = await this.items.find({ where: { cartId: cart.id } });

    const withOffers = await Promise.all(
      items.map(async (item) => ({
        ...item,
        offer: await this.offers.findById(item.offerId),
      })),
    );

    return { ...cart, items: withOffers as CartItemView[] };
  }

  async removeItem(buyerId: string, itemId: string): Promise<void> {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Item não encontrado');
    }

    const cart = await this.getOrCreateCart(buyerId);
    if (item.cartId !== cart.id) {
      throw new ForbiddenException('Este item não pertence ao seu carrinho');
    }

    await this.items.delete(item.id);
  }

  async clear(buyerId: string): Promise<void> {
    const cart = await this.getOrCreateCart(buyerId);
    await this.items.delete({ cartId: cart.id });
  }
}
