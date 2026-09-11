import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OrderItemEntity } from './entities/order-item.entity';
import { OrderEntity } from './entities/order.entity';
import { SubOrderEntity } from './entities/sub-order.entity';
import { SubOrderStatus } from './sub-order-status.enum';

export interface CreateOrderItemInput {
  offerId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface CreateSubOrderInput {
  sellerId: string;
  items: CreateOrderItemInput[];
}

export interface SubOrderWithItems extends SubOrderEntity {
  items: OrderItemEntity[];
}

export interface OrderWithSubOrders extends OrderEntity {
  subOrders: SubOrderWithItems[];
}

@Injectable()
export class OrdersService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Pure persistence: takes the sub-order/item breakdown the caller
   * (checkout) already computed from the cart and writes Order + N
   * SubOrder + their items in one transaction. Orders knows nothing
   * about cart or inventory — it only ever sees the shape it's handed.
   */
  async create(
    buyerId: string,
    subOrders: CreateSubOrderInput[],
  ): Promise<OrderWithSubOrders> {
    return this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(OrderEntity);
      const subOrderRepo = manager.getRepository(SubOrderEntity);
      const itemRepo = manager.getRepository(OrderItemEntity);

      const totalCents = subOrders.reduce((sum, so) => sum + subtotal(so), 0);

      const order = await orderRepo.save(
        orderRepo.create({ buyerId, totalCents, status: 'pending' }),
      );

      const persistedSubOrders: SubOrderWithItems[] = [];
      for (const so of subOrders) {
        const subOrder = await subOrderRepo.save(
          subOrderRepo.create({
            orderId: order.id,
            sellerId: so.sellerId,
            subtotalCents: subtotal(so),
            shippingCents: 0,
            status: SubOrderStatus.Pending,
          }),
        );

        const items = await itemRepo.save(
          so.items.map((item) =>
            itemRepo.create({
              subOrderId: subOrder.id,
              offerId: item.offerId,
              quantity: item.quantity,
              unitPriceCents: item.unitPriceCents,
            }),
          ),
        );

        persistedSubOrders.push({ ...subOrder, items });
      }

      return { ...order, subOrders: persistedSubOrders };
    });
  }
}

function subtotal(subOrder: CreateSubOrderInput): number {
  return subOrder.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}
