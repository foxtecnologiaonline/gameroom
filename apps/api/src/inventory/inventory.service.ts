import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OffersService } from '../catalog/offers.service';
import { Role } from '../identity/role.enum';
import { SellersService } from '../seller/sellers.service';
import { ReservationEntity } from './entities/reservation.entity';
import { ReservationStatus } from './reservation-status.enum';

export interface RequestingUser {
  id: string;
  roles: string[];
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservations: Repository<ReservationEntity>,
    private readonly offers: OffersService,
    private readonly sellers: SellersService,
  ) {}

  async reserve(offerId: string, quantity: number): Promise<ReservationEntity> {
    await this.offers.reserveStock(offerId, quantity);

    const reservation = this.reservations.create({
      offerId,
      quantity,
      status: ReservationStatus.Active,
    });
    return this.reservations.save(reservation);
  }

  async release(
    offerId: string,
    reservationId: string,
  ): Promise<ReservationEntity> {
    const reservation = await this.reservations.findOne({
      where: { id: reservationId },
    });
    if (!reservation || reservation.offerId !== offerId) {
      throw new NotFoundException('Reserva não encontrada para esta oferta');
    }
    if (reservation.status !== ReservationStatus.Active) {
      throw new ConflictException('Esta reserva já foi liberada');
    }

    await this.offers.releaseStock(offerId, reservation.quantity);

    reservation.status = ReservationStatus.Released;
    reservation.releasedAt = new Date();
    return this.reservations.save(reservation);
  }

  async updateStock(offerId: string, requester: RequestingUser, stock: number) {
    const offer = await this.offers.findById(offerId);
    if (!offer) {
      throw new NotFoundException('Oferta não encontrada');
    }

    const isAdmin = requester.roles.includes(Role.Admin);
    if (!isAdmin) {
      const seller = await this.sellers.findApprovedByUserId(requester.id);
      if (!seller || seller.id !== offer.sellerId) {
        throw new ForbiddenException(
          'Você só pode alterar o estoque das suas próprias ofertas',
        );
      }
    }

    return this.offers.setStock(offerId, stock);
  }
}
