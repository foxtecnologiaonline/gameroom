import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  SUB_ORDER_STATUS_CHANGED,
  SubOrderStatusChangedEvent,
} from './events/sub-order-status-changed.event';
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
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity)
    private readonly orders: Repository<OrderEntity>,
    @InjectRepository(SubOrderEntity)
    private readonly subOrders: Repository<SubOrderEntity>,
    @InjectRepository(OrderItemEntity)
    private readonly orderItems: Repository<OrderItemEntity>,
    private readonly events: EventEmitter2,
  ) {}

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

  async findById(orderId: string): Promise<OrderWithSubOrders | null> {
    const order = await this.orders.findOne({ where: { id: orderId } });
    if (!order) {
      return null;
    }

    const subOrders = await this.subOrders.find({ where: { orderId } });
    const withItems = await Promise.all(
      subOrders.map(async (subOrder) => ({
        ...subOrder,
        items: await this.orderItems.find({
          where: { subOrderId: subOrder.id },
        }),
      })),
    );

    return { ...order, subOrders: withItems };
  }

  /**
   * The only way a SubOrder's status changes. Always emits
   * SUB_ORDER_STATUS_CHANGED (non-negotiable rule in CLAUDE.md) — callers
   * never update the entity directly.
   */
  async updateSubOrderStatus(
    subOrderId: string,
    newStatus: SubOrderStatus,
  ): Promise<SubOrderEntity> {
    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
    });
    if (!subOrder) {
      throw new NotFoundException('SubOrder não encontrado');
    }

    const previousStatus = subOrder.status;
    subOrder.status = newStatus;
    const saved = await this.subOrders.save(subOrder);

    this.events.emit(
      SUB_ORDER_STATUS_CHANGED,
      new SubOrderStatusChangedEvent(
        saved.id,
        saved.orderId,
        saved.sellerId,
        previousStatus,
        newStatus,
      ),
    );

    return saved;
  }
}

function subtotal(subOrder: CreateSubOrderInput): number {
  return subOrder.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}
