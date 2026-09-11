import { ConflictException, Injectable } from '@nestjs/common';
import { CartService } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CreateSubOrderInput,
  OrderWithSubOrders,
  OrdersService,
} from '../orders/orders.service';

interface ReservedOffer {
  offerId: string;
  reservationId: string;
}

@Injectable()
export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly inventory: InventoryService,
    private readonly orders: OrdersService,
  ) {}

  async checkout(buyerId: string): Promise<OrderWithSubOrders> {
    const cart = await this.cart.getCart(buyerId);
    if (cart.items.length === 0) {
      throw new ConflictException('Carrinho vazio');
    }

    const reserved: ReservedOffer[] = [];
    try {
      for (const item of cart.items) {
        const reservation = await this.inventory.reserve(
          item.offerId,
          item.quantity,
        );
        reserved.push({ offerId: item.offerId, reservationId: reservation.id });
      }

      const subOrdersBySeller = new Map<string, CreateSubOrderInput>();
      for (const item of cart.items) {
        const sellerId = item.offer.sellerId;
        const subOrder = subOrdersBySeller.get(sellerId) ?? {
          sellerId,
          items: [],
        };
        subOrder.items.push({
          offerId: item.offerId,
          quantity: item.quantity,
          unitPriceCents: item.offer.priceCents,
        });
        subOrdersBySeller.set(sellerId, subOrder);
      }

      const order = await this.orders.create(buyerId, [
        ...subOrdersBySeller.values(),
      ]);
      await this.cart.clear(buyerId);
      return order;
    } catch (err) {
      await this.releaseAll(reserved);
      throw err;
    }
  }

  private async releaseAll(reserved: ReservedOffer[]): Promise<void> {
    for (const { offerId, reservationId } of reserved) {
      try {
        await this.inventory.release(offerId, reservationId);
      } catch {
        // best-effort compensation; the original error is what the caller sees
      }
    }
  }
}
