import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function getSeedPassword(envVar: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} 未设置。请在 .env 中配置种子账户密码（参见 .env.example）`
    );
  }
  return value;
}

async function main() {
  const adminPassword = await bcrypt.hash(getSeedPassword('SEED_ADMIN_PASSWORD'), 10);
  const userPassword = await bcrypt.hash(getSeedPassword('SEED_USER_PASSWORD'), 10);

  await prisma.user.upsert({
    where: { email: 'admin@dm.local' },
    update: {},
    create: { username: 'admin', email: 'admin@dm.local', password: adminPassword, role: 'admin' },
  });
  await prisma.user.upsert({
    where: { email: 'user@dm.local' },
    update: {},
    create: { username: 'user', email: 'user@dm.local', password: userPassword, role: 'user' },
  });
  console.log('Seed 完成: admin@dm.local (admin) / user@dm.local (user)');
}

main()
  .finally(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Seed 失败:', err);
    process.exit(1);
  });
