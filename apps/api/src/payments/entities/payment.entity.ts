import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentMethod } from '../payment-method.enum';
import { PaymentStatus } from '../payment-status.enum';

@Entity({ name: 'payments', schema: 'payments' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Index({ unique: true })
  @Column({ name: 'gateway_id' })
  gatewayId: string;

  @Column({ type: 'enum', enum: PaymentStatus, enumName: 'payment_status' })
  status: PaymentStatus;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'payment_method' })
  method: PaymentMethod;

  @Column({ name: 'total_cents', type: 'int' })
  totalCents: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
