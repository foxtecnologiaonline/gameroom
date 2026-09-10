import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { Role } from './role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  findByEmail(email: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { email } });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ where: { id } });
  }

  create(
    email: string,
    passwordHash: string,
    roles: Role[] = [Role.Buyer],
  ): Promise<UserEntity> {
    const user = this.users.create({ email, passwordHash, roles });
    return this.users.save(user);
  }

  save(user: UserEntity): Promise<UserEntity> {
    return this.users.save(user);
  }
}
