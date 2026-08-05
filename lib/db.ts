import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalWithPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

let prisma: PrismaClient;

if (typeof window === 'undefined') {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  
  prisma = globalWithPrisma.prisma || new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalWithPrisma.prisma = prisma;
  }
} else {
  prisma = new PrismaClient();
}

export { prisma };
