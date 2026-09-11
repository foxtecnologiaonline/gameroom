import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'order_items', schema: 'orders' })
export class OrderItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'sub_order_id', type: 'uuid' })
  subOrderId: string;

  @Column({ name: 'offer_id', type: 'uuid' })
  offerId: string;

  @Column({ name: 'qty', type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price_cents', type: 'int' })
  unitPriceCents: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
