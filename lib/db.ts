import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalWithPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const url = process.env.DATABASE_URL?.replace(/^mysql:/, 'mariadb:');
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }
  prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
} else {
  if (!globalWithPrisma.prisma) {
    const url = process.env.DATABASE_URL?.replace(/^mysql:/, 'mariadb:');
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not defined");
    }
    globalWithPrisma.prisma = new PrismaClient({ adapter: new PrismaMariaDb(url) });
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
