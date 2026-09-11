import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IdempotencyStatus } from './idempotency-status.enum';

/**
 * Backs the Idempotency-Key contract required by CLAUDE.md for every
 * endpoint that moves money or stock. Lives in a neutral `platform` schema
 * (not owned by any bounded context) since it's cross-cutting infra reused
 * by inventory, checkout and payments alike.
 */
@Entity({ name: 'idempotency_keys', schema: 'platform' })
@Index(['key', 'method', 'path'], { unique: true })
export class IdempotencyRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  key: string;

  @Column()
  method: string;

  @Column()
  path: string;

  @Column({
    type: 'enum',
    enum: IdempotencyStatus,
    enumName: 'idempotency_status',
  })
  status: IdempotencyStatus;

  @Column({ name: 'response_status', type: 'int', nullable: true })
  responseStatus: number | null;

  @Column({ name: 'response_body', type: 'jsonb', nullable: true })
  responseBody: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
