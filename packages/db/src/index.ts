import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client.ts";

export * from "./generated/client.ts";

/**
 * Next.js dev mode and Vercel's Fluid Compute both re-evaluate modules while
 * keeping the process alive, so a plain `new PrismaClient()` leaks a connection
 * pool per reload until Postgres refuses new connections. Cache it on
 * globalThis, which survives HMR but not a cold start.
 */
const globalForPrisma = globalThis as unknown as {
  animaleskoPrisma: PrismaClient | undefined;
};

export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and run `pnpm db:up`.");
  }

  // Prisma 7 drops the built-in Rust query engine in favour of driver adapters,
  // so the connection string is supplied here rather than in schema.prisma.
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: url }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  const existing = globalForPrisma.animaleskoPrisma;
  if (existing) return existing;

  const created = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.animaleskoPrisma = created;
  }
  return created;
}

/**
 * The shared client, constructed on first use rather than on import.
 *
 * Laziness matters: importing this module must not require DATABASE_URL, or
 * anything that merely pulls in a type or enum from @animalesko/db (scripts,
 * the seed, `prisma.config.ts`) would fail before dotenv has had a chance to
 * run.
 */
export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property) as unknown;
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export { PrismaClient };
export type Database = PrismaClient;
