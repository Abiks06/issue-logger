import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const globalWithPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL environment variable is not defined");
  }

  // Parse connection params explicitly instead of passing a URL string.
  // This avoids double URL-encoding issues when special characters
  // (e.g. #, $, @) appear in the password.
  const url = new URL(raw.replace(/^mysql:/, 'mariadb:'));

  const adapter = new PrismaMariaDb({
    host: url.hostname === 'localhost' ? '127.0.0.1' : url.hostname,
    port: Number(url.port) || 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1), // strip leading /
    // MySQL 8/9 default to caching_sha2_password; without TLS the client
    // must fetch the server's RSA public key or the handshake hangs.
    allowPublicKeyRetrieval: true,
    connectTimeout: 10000,
  });

  return new PrismaClient({ adapter });
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = createPrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

export { prisma };
