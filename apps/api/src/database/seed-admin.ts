import 'dotenv/config';
import * as bcrypt from 'bcryptjs';
import { Role } from '../identity/role.enum';
import { UserEntity } from '../identity/entities/user.entity';
import dataSource from './data-source';

const BCRYPT_ROUNDS = 12;

/**
 * Idempotent: creates the admin user from ADMIN_EMAIL/ADMIN_PASSWORD, or
 * promotes it to the admin role if it already exists. Needed to bootstrap
 * seller approval (backlog item 3), which has no other way to grant admin.
 */
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'ADMIN_EMAIL e ADMIN_PASSWORD são obrigatórios para o seed',
    );
  }

  await dataSource.initialize();
  const users = dataSource.getRepository(UserEntity);

  let user = await users.findOne({ where: { email } });
  if (!user) {
    user = users.create({
      email,
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      roles: [Role.Admin],
    });
    await users.save(user);
    console.log(`Admin criado: ${email}`);
  } else if (!user.roles.includes(Role.Admin)) {
    user.roles = [...user.roles, Role.Admin];
    await users.save(user);
    console.log(`Admin promovido: ${email}`);
  } else {
    console.log(`Admin já existente: ${email}`);
  }

  await dataSource.destroy();
}

seedAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
