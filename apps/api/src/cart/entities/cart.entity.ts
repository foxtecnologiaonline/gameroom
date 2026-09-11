import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'carts', schema: 'cart' })
export class CartEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'buyer_id', type: 'uuid' })
  buyerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
