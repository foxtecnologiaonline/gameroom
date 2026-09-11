import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderWithSubOrders, OrdersService } from '../orders/orders.service';
import { SubOrderStatus } from '../orders/sub-order-status.enum';
import { SellersService } from '../seller/sellers.service';
import { ChargeDto } from './dto/charge.dto';
import { WebhookDto } from './dto/webhook.dto';
import { PaymentEntity } from './entities/payment.entity';
import { SplitTransactionEntity } from './entities/split-transaction.entity';
import {
  PAYMENT_STATUS_CHANGED,
  PaymentStatusChangedEvent,
} from './events/payment-status-changed.event';
import {
  ChargeSplit,
  PAYMENT_GATEWAY,
  PaymentGateway,
} from './gateways/payment.gateway';
import { PaymentStatus } from './payment-status.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(SplitTransactionEntity)
    private readonly splits: Repository<SplitTransactionEntity>,
    private readonly orders: OrdersService,
    private readonly sellers: SellersService,
    private readonly events: EventEmitter2,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: PaymentGateway,
  ) {}

  async charge(buyerId: string, dto: ChargeDto): Promise<PaymentEntity> {
    const order = await this.orders.findById(dto.orderId);
    if (!order) {
      throw new NotFoundException('Order não encontrado');
    }
    if (order.buyerId !== buyerId) {
      throw new ForbiddenException('Este order não pertence a você');
    }
    if (order.status !== 'pending') {
      throw new ConflictException('Order já foi processado');
    }

    const existing = await this.payments.findOne({
      where: { orderId: order.id },
    });
    if (existing) {
      throw new ConflictException('Já existe uma cobrança para este order');
    }

    const chargeSplits: ChargeSplit[] = [];
    for (const subOrder of order.subOrders) {
      const seller = await this.sellers.findById(subOrder.sellerId);
      chargeSplits.push({
        sellerId: subOrder.sellerId,
        recipientId: seller?.recipientId ?? null,
        amountCents: subOrder.subtotalCents + subOrder.shippingCents,
      });
    }

    const result = await this.gateway.charge({
      orderId: order.id,
      method: dto.method,
      totalCents: order.totalCents,
      splits: chargeSplits,
    });

    const payment = await this.payments.save(
      this.payments.create({
        orderId: order.id,
        gatewayId: result.gatewayId,
        status: result.status,
        method: dto.method,
        totalCents: order.totalCents,
      }),
    );

    await this.splits.save(
      chargeSplits.map((split) =>
        this.splits.create({
          paymentId: payment.id,
          sellerId: split.sellerId,
          amountCents: split.amountCents,
          feeCents: 0,
          status: result.status,
        }),
      ),
    );

    this.events.emit(
      PAYMENT_STATUS_CHANGED,
      new PaymentStatusChangedEvent(payment.id, order.id, null, payment.status),
    );

    if (result.status === PaymentStatus.Paid) {
      await this.markSubOrdersPaid(order);
    }

    return payment;
  }

  /**
   * Idempotent by comparing against the payment's current status rather
   * than a client-supplied Idempotency-Key: this endpoint is called by
   * the gateway, not by our own authenticated clients, so it has no such
   * header — a re-delivery of an already-applied status is just a no-op.
   */
  async handleWebhook(dto: WebhookDto): Promise<PaymentEntity> {
    const payment = await this.payments.findOne({
      where: { gatewayId: dto.gatewayId },
    });
    if (!payment) {
      throw new NotFoundException(
        'Pagamento não encontrado para este gatewayId',
      );
    }

    if (payment.status === dto.status) {
      return payment;
    }

    const previousStatus = payment.status;
    payment.status = dto.status;
    const saved = await this.payments.save(payment);

    this.events.emit(
      PAYMENT_STATUS_CHANGED,
      new PaymentStatusChangedEvent(
        saved.id,
        saved.orderId,
        previousStatus,
        saved.status,
      ),
    );

    const currentSplits = await this.splits.find({
      where: { paymentId: payment.id },
    });
    const latestBySeller = new Map(
      currentSplits.map((split) => [split.sellerId, split]),
    );
    await this.splits.save(
      [...latestBySeller.values()].map((split) =>
        this.splits.create({
          paymentId: payment.id,
          sellerId: split.sellerId,
          amountCents: split.amountCents,
          feeCents: split.feeCents,
          status: dto.status,
        }),
      ),
    );

    if (dto.status === PaymentStatus.Paid) {
      const order = await this.orders.findById(payment.orderId);
      if (order) {
        await this.markSubOrdersPaid(order);
      }
    }

    return saved;
  }

  private async markSubOrdersPaid(order: OrderWithSubOrders): Promise<void> {
    for (const subOrder of order.subOrders) {
      if (subOrder.status === SubOrderStatus.Pending) {
        await this.orders.updateSubOrderStatus(
          subOrder.id,
          SubOrderStatus.Paid,
        );
      }
    }
  }
}
