import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SellerStatus } from '../seller-status.enum';

@Entity({ name: 'sellers', schema: 'seller' })
export class SellerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'store_name' })
  storeName: string;

  @Column()
  document: string;

  @Column({
    type: 'enum',
    enum: SellerStatus,
    enumName: 'seller_status',
    default: SellerStatus.Pending,
  })
  status: SellerStatus;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;
}
