import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@dm.local' },
    update: {},
    create: { username: 'admin', email: 'admin@dm.local', password, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'user@dm.local' },
    update: {},
    create: { username: 'user', email: 'user@dm.local', password, role: 'user' },
  });
  console.log('Seed 完成: admin@dm.local / user@dm.local (密码 admin123)');
}

main().finally(() => prisma.$disconnect());
