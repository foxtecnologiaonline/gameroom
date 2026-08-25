import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Cria o primeiro admin do sistema — necessário porque o endpoint
 * POST /auth/admins exige um admin já autenticado (ver §5 da especificação v2,
 * decisão de segurança: ninguém pode se auto-promover a admin por um endpoint público).
 *
 * Uso: ADMIN_SEED_EMAIL=... ADMIN_SEED_SENHA=... npx prisma db seed
 */
async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? 'admin@gameroom.local';
  const senha = process.env.ADMIN_SEED_SENHA ?? 'trocar-esta-senha-123';

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Admin ${email} já existe, nada a fazer.`);
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 12);
  await prisma.usuario.create({
    data: { nome: 'Admin', email, senhaHash, tipo: 'admin' },
  });
  console.log(`Admin inicial criado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
