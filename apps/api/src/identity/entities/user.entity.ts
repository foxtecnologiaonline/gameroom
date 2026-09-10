import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../role.enum';

@Entity({ name: 'users', schema: 'identity' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'text', array: true, default: () => "'{buyer}'" })
  roles: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
