import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from '../orders/orders.service';
import { SubOrderStatus } from '../orders/sub-order-status.enum';
import { Role } from '../identity/role.enum';
import { SellersService } from '../seller/sellers.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { QuoteDto } from './dto/quote.dto';
import { ShipmentEntity } from './entities/shipment.entity';
import {
  SHIPPING_GATEWAY,
  ShippingGateway,
  ShippingOption,
} from './gateways/shipping.gateway';
import { ShipmentStatus } from './shipment-status.enum';

export interface RequestingUser {
  id: string;
  roles: string[];
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(ShipmentEntity)
    private readonly shipments: Repository<ShipmentEntity>,
    private readonly orders: OrdersService,
    private readonly sellers: SellersService,
    @Inject(SHIPPING_GATEWAY)
    private readonly gateway: ShippingGateway,
  ) {}

  quote(dto: QuoteDto): Promise<ShippingOption[]> {
    return this.gateway.quote({
      destinationZip: dto.destinationZip,
      weightGrams: dto.weightGrams,
    });
  }

  async createLabel(
    requester: RequestingUser,
    dto: CreateLabelDto,
  ): Promise<ShipmentEntity> {
    const subOrder = await this.orders.findSubOrderById(dto.subOrderId);
    if (!subOrder) {
      throw new NotFoundException('SubOrder não encontrado');
    }

    const seller = await this.sellers.findApprovedByUserId(requester.id);
    if (!seller || seller.id !== subOrder.sellerId) {
      throw new ForbiddenException(
        'Você só pode gerar etiqueta para os seus próprios sub-orders',
      );
    }
    if (subOrder.status !== SubOrderStatus.Paid) {
      throw new ConflictException('Este sub-order ainda não foi pago');
    }

    const existing = await this.shipments.findOne({
      where: { subOrderId: dto.subOrderId },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe uma etiqueta gerada para este sub-order',
      );
    }

    const label = await this.gateway.createLabel({
      destinationZip: dto.destinationZip,
      weightGrams: dto.weightGrams,
      carrier: dto.carrier,
    });

    const shipment = await this.shipments.save(
      this.shipments.create({
        subOrderId: dto.subOrderId,
        carrier: dto.carrier,
        trackingCode: label.trackingCode,
        status: ShipmentStatus.LabelCreated,
        etaDays: label.etaDays,
      }),
    );

    await this.orders.updateSubOrderStatus(
      dto.subOrderId,
      SubOrderStatus.Shipped,
    );

    return shipment;
  }

  async getTracking(
    shipmentId: string,
    requester: RequestingUser,
  ): Promise<ShipmentEntity> {
    const shipment = await this.shipments.findOne({
      where: { id: shipmentId },
    });
    if (!shipment) {
      throw new NotFoundException('Etiqueta não encontrada');
    }

    const subOrder = await this.orders.findSubOrderById(shipment.subOrderId);
    if (!subOrder) {
      throw new NotFoundException('SubOrder não encontrado');
    }

    const isAdmin = requester.roles.includes(Role.Admin);
    const seller = await this.sellers.findApprovedByUserId(requester.id);
    const isSeller = seller?.id === subOrder.sellerId;

    let isBuyer = false;
    if (!isAdmin && !isSeller) {
      const order = await this.orders.findById(subOrder.orderId);
      isBuyer = order?.buyerId === requester.id;
    }

    if (!isAdmin && !isSeller && !isBuyer) {
      throw new ForbiddenException('Sem permissão para ver esta etiqueta');
    }

    return shipment;
  }
}
