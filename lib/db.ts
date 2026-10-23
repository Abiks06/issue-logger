import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * TLS for the database connection. Local databases connect in plain text;
 * remote ones are encrypted by default. Supabase's pooler presents a
 * certificate signed by Supabase's own CA (not in Node's trust store), so
 * verification is opt-in via DATABASE_SSL=verify with the CA in NODE_EXTRA_CA_CERTS.
 */
function sslFor(connectionString: string): pg.PoolConfig['ssl'] {
  const mode = process.env.DATABASE_SSL;
  if (mode === 'disable') return false;
  if (mode === 'verify') return { rejectUnauthorized: true };
  const host = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return '';
    }
  })();
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
  return local ? false : { rejectUnauthorized: false };
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL ?? '';
  const pool = new pg.Pool({
    connectionString,
    ssl: sslFor(connectionString),
    // Serverless functions each hold their own pool; keep it small so many
    // concurrent instances stay inside the pooler's client limit.
    max: Number(process.env.DATABASE_POOL_MAX ?? (process.env.VERCEL ? 3 : 10)),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  pool.on('error', (err) => console.error('Idle database client error', err));
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

// Reuse one client per process: across hot reloads in development, and across
// invocations of a warm serverless instance in production.
globalThis.prisma = prisma;
