import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'orders', schema: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @Column({ name: 'total_cents', type: 'int' })
  totalCents: number;

  /**
   * Plain string, not a Postgres enum: unlike SubOrder, the spec doesn't
   * pin down the Order-level status value set (it may end up derived from
   * sub-order statuses once item 10 defines that). 'pending' is the only
   * value written today, at checkout time.
   */
  @Column({ default: 'pending' })
  status: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
