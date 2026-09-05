import { PrismaClient } from '@prisma/client';

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (!url.includes('connection_limit=')) {
    url += (url.includes('?') ? '&' : '?') + 'connection_limit=5';
  }
  if (!url.includes('pool_timeout=')) {
    url += (url.includes('?') ? '&' : '?') + 'pool_timeout=30';
  }
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const databaseUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
