import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PaymentStatus } from '../payment-status.enum';

/**
 * Append-only audit mirror of the gateway's split (CLAUDE.md: "Toda
 * tabela financeira é append-only... sem UPDATE destrutivo em
 * split_transactions"). A status change for the same payment/seller is a
 * NEW row, never an UPDATE — PaymentsService only ever calls .save() on a
 * freshly created entity here, never .update()/.save() on one it loaded.
 */
@Entity({ name: 'split_transactions', schema: 'payments' })
export class SplitTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'payment_id', type: 'uuid' })
  paymentId: string;

  @Column({ name: 'seller_id', type: 'uuid' })
  sellerId: string;

  @Column({ name: 'amount_cents', type: 'int' })
  amountCents: number;

  @Column({ name: 'fee_cents', type: 'int', default: 0 })
  feeCents: number;

  @Column({ type: 'enum', enum: PaymentStatus, enumName: 'payment_status' })
  status: PaymentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
