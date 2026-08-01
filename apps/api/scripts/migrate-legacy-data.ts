import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync, appendFileSync } from 'fs';
import { UserCreateSchema } from '@dm/shared';

const prisma = new PrismaClient();
const LEGACY_PATH = 'legacy-data/db.json';
const ERR_LOG = 'migration-errors.log';

async function main() {
  if (!existsSync(LEGACY_PATH)) {
    console.log('无旧 db.json，跳过迁移');
    return;
  }
  const db = JSON.parse(readFileSync(LEGACY_PATH, 'utf-8'));
  const idMap = new Map<number, number>();

  for (const u of db.users ?? []) {
    const r = UserCreateSchema.safeParse(u);
    if (!r.success) {
      appendFileSync(ERR_LOG, `SKIP user ${u.id}: ${JSON.stringify(r.error.flatten())}\n`);
      continue;
    }
    const created = await prisma.user.create({ data: r.data });
    idMap.set(u.id, created.id);
  }
  console.log(`迁移用户: ${idMap.size}`);
}

main().finally(() => prisma.$disconnect());
