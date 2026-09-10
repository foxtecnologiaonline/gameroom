import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OfferCondition } from '../offer-condition.enum';

@Entity({ name: 'offers', schema: 'catalog' })
export class OfferEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ name: 'price_cents', type: 'int' })
  priceCents: number;

  @Column({ type: 'int' })
  stock: number;

  @Column({ type: 'enum', enum: OfferCondition, enumName: 'offer_condition' })
  condition: OfferCondition;

  @Column({ name: 'sla_days', type: 'int' })
  slaDays: number;

  @Column({ name: 'is_buybox_winner', default: false })
  isBuyboxWinner: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
