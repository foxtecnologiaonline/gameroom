import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../identity/role.enum';
import { SellersService } from '../seller/sellers.service';
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

export interface RequestingUser {
  id: string;
  roles: string[];
}

/**
 * Fixed forward path (CLAUDE.md): pending -> paid -> shipped -> delivered.
 * `null` means terminal — no further PATCH transition is legal from there.
 * pending->paid and paid->shipped are normally driven by `payments`/
 * `shipping` calling updateSubOrderStatus directly; this map is what
 * PATCH /suborders/:id/status (a manual, seller-driven transition — e.g.
 * marking `delivered` once no carrier webhook exists) is allowed to do.
 */
const NEXT_STATUS: Record<SubOrderStatus, SubOrderStatus | null> = {
  [SubOrderStatus.Pending]: SubOrderStatus.Paid,
  [SubOrderStatus.Paid]: SubOrderStatus.Shipped,
  [SubOrderStatus.Shipped]: SubOrderStatus.Delivered,
  [SubOrderStatus.Delivered]: null,
};

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
    private readonly sellers: SellersService,
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
   * GET /orders/:id — the buyer sees only their own consolidated Order;
   * admin sees any.
   */
  async findByIdForRequester(
    orderId: string,
    requester: RequestingUser,
  ): Promise<OrderWithSubOrders> {
    const order = await this.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order não encontrado');
    }

    const isOwner = order.buyerId === requester.id;
    const isAdmin = requester.roles.includes(Role.Admin);
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Sem permissão para ver este order');
    }

    return order;
  }

  findSubOrderById(subOrderId: string): Promise<SubOrderEntity | null> {
    return this.subOrders.findOne({ where: { id: subOrderId } });
  }

  /**
   * GET /sellers/:id/orders — a seller sees only their own SubOrders;
   * admin sees any seller's. Reuses SellersService.findByIdForRequester
   * for the exact same ownership/404/403 check `GET /sellers/:id` already
   * enforces, instead of re-deriving it here.
   */
  async findSubOrdersForSeller(
    sellerId: string,
    requester: RequestingUser,
  ): Promise<SubOrderWithItems[]> {
    await this.sellers.findByIdForRequester(sellerId, requester);

    const subOrders = await this.subOrders.find({
      where: { sellerId },
      order: { createdAt: 'DESC' },
    });

    return Promise.all(
      subOrders.map(async (subOrder) => ({
        ...subOrder,
        items: await this.orderItems.find({
          where: { subOrderId: subOrder.id },
        }),
      })),
    );
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

  /**
   * PATCH /suborders/:id/status — the seller who owns the SubOrder (or
   * admin) manually advances it exactly one step along NEXT_STATUS.
   * Delegates the actual mutation to updateSubOrderStatus so the event
   * is always emitted through the single established choke point.
   */
  async transitionSubOrderStatus(
    subOrderId: string,
    newStatus: SubOrderStatus,
    requester: RequestingUser,
  ): Promise<SubOrderEntity> {
    const subOrder = await this.subOrders.findOne({
      where: { id: subOrderId },
    });
    if (!subOrder) {
      throw new NotFoundException('SubOrder não encontrado');
    }

    const isAdmin = requester.roles.includes(Role.Admin);
    if (!isAdmin) {
      const seller = await this.sellers.findApprovedByUserId(requester.id);
      if (!seller || seller.id !== subOrder.sellerId) {
        throw new ForbiddenException(
          'Você só pode alterar o status dos seus próprios sub-orders',
        );
      }
    }

    const allowedNext = NEXT_STATUS[subOrder.status];
    if (allowedNext !== newStatus) {
      throw new ConflictException(
        `Transição inválida: ${subOrder.status} -> ${newStatus}`,
      );
    }

    return this.updateSubOrderStatus(subOrderId, newStatus);
  }
}

function subtotal(subOrder: CreateSubOrderInput): number {
  return subOrder.items.reduce(
    (sum, item) => sum + item.unitPriceCents * item.quantity,
    0,
  );
}
