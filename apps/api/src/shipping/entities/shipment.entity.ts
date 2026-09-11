import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ShipmentStatus } from '../shipment-status.enum';

@Entity({ name: 'shipments', schema: 'shipping' })
export class ShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'sub_order_id', type: 'uuid' })
  subOrderId: string;

  @Column()
  carrier: string;

  @Column({ name: 'tracking_code' })
  trackingCode: string;

  @Column({
    type: 'enum',
    enum: ShipmentStatus,
    enumName: 'shipment_status',
    default: ShipmentStatus.LabelCreated,
  })
  status: ShipmentStatus;

  @Column({ name: 'eta_days', type: 'int' })
  etaDays: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
