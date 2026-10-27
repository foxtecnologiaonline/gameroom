import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'products', schema: 'catalog' })
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @Column({ nullable: true })
  brand: string | null;

  @Column({ type: 'jsonb', default: {} })
  attributes: Record<string, unknown>;

  /**
   * Catalog moderation (backlog item 14): `null` = active/visible in the
   * public storefront; set = taken down by an admin. Soft, not a delete —
   * consistent with the project's no-destructive-removal pattern
   * elsewhere (append-only financial tables, etc).
   */
  @Column({ name: 'suspended_at', type: 'timestamptz', nullable: true })
  suspendedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
