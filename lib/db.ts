import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  // Strip pgbouncer param — the pg driver doesn't understand it;
  // Prisma 7 driver adapter handles pooling directly via pg.Pool.
  const connectionString = (process.env.DATABASE_URL ?? '').replace(
    '?pgbouncer=true',
    ''
  );
  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

