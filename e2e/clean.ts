import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [{ db }] = await prisma.$queryRaw<{ db: string }[]>`select current_database() as db`;
  if (!db.endsWith("_e2e")) throw new Error(`Відмовляюсь очищати базу ${db}: тести працюють лише з *_e2e`);
  const tables = await prisma.$queryRaw<{ name: string }[]>`select tablename as name from pg_tables where schemaname = 'public'`;
  if (tables.length) await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.name}"`).join(", ")} RESTART IDENTITY CASCADE`);
}

main().finally(() => prisma.$disconnect());
