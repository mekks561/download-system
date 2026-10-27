import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$queryRawUnsafe('DESCRIBE users');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());