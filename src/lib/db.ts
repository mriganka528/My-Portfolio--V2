import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export class DatabaseUnavailableError extends Error {
  constructor() { super("The database is not configured."); }
}

const globalDb = globalThis as unknown as { portfolioDb?: PrismaClient };

export function getDb() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseUnavailableError();
  if (!globalDb.portfolioDb) {
    const adapter = new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
    globalDb.portfolioDb = new PrismaClient({ adapter });
  }
  return globalDb.portfolioDb;
}
