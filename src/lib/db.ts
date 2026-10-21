import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export class DatabaseUnavailableError extends Error {
  constructor() { super("The database is not configured."); }
}

type ClientCache = { client: PrismaClient; models: string };

const globalDb = globalThis as unknown as { portfolioDb?: ClientCache | PrismaClient };

function modelNames(client: PrismaClient) {
  const models = (client as unknown as { _runtimeDataModel?: { models?: Record<string, unknown> } })._runtimeDataModel?.models;
  return models ? Object.keys(models).sort().join(",") : "";
}

// The generated client is rebuilt whenever the Prisma schema changes. A client
// instance that was created before that change keeps working, but it does not
// expose the new models, so the cached instance is compared with the current
// one and replaced when the schema moved on.
let currentModels: string | null = null;
function currentModelNames(connectionString: string) {
  if (currentModels === null) {
    try {
      const probe = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
      currentModels = modelNames(probe);
      void probe.$disconnect().catch(() => undefined);
    } catch {
      currentModels = "";
    }
  }
  return currentModels;
}

function readCache(): ClientCache | null {
  const cached = globalDb.portfolioDb;
  if (!cached) return null;
  const entry = cached as ClientCache;
  if (entry && typeof entry.client === "object" && entry.client) {
    return { client: entry.client, models: entry.models ?? modelNames(entry.client) };
  }
  // Older builds cached the client instance on its own.
  const legacy = cached as PrismaClient;
  return typeof legacy?.$disconnect === "function" ? { client: legacy, models: modelNames(legacy) } : null;
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new DatabaseUnavailableError();
  const models = currentModelNames(connectionString);
  const cached = readCache();
  if (cached && (models === "" || cached.models === models)) return cached.client;
  if (cached) void cached.client.$disconnect().catch(() => undefined);
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }) });
  globalDb.portfolioDb = { client, models };
  return client;
}
