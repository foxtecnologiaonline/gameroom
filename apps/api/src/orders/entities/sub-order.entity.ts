import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SubOrderStatus } from '../sub-order-status.enum';

@Entity({ name: 'sub_orders', schema: 'orders' })
export class SubOrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ name: 'subtotal_cents', type: 'int' })
  subtotalCents: number;

  @Column({ name: 'shipping_cents', type: 'int', default: 0 })
  shippingCents: number;

  @Column({
    type: 'enum',
    enum: SubOrderStatus,
    enumName: 'sub_order_status',
    default: SubOrderStatus.Pending,
  })
  status: SubOrderStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
