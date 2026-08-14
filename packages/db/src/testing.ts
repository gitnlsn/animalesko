import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client.ts";

/**
 * Helpers for the integration suite. Nothing here is imported by application
 * code — it all points at TEST_DATABASE_URL and truncates tables.
 */

export function testDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;

  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Copy .env.example to .env and run `pnpm db:up`.",
    );
  }

  // A misconfigured TEST_DATABASE_URL pointed at a real database would be
  // silently wiped by resetDatabase(). Refuse anything not named *_test.
  const database = new URL(url).pathname.replace(/^\//, "");
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${database}": the database name must end in "_test".`,
    );
  }

  return url;
}

export interface TestClientOptions {
  /**
   * Upper bound on this client's connection pool.
   *
   * The suite runs one Vitest worker per core, each with its own client, and
   * each concurrent test holds a connection for the life of its transaction.
   * Left unbounded, `workers × pool` climbs towards Postgres' `max_connections`
   * (200 in docker-compose.yml) and tests start failing to acquire a
   * connection rather than failing on their assertions.
   */
  maxConnections?: number;
}

export function createTestClient(options: TestClientOptions = {}): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: testDatabaseUrl(),
      max: options.maxConnections ?? 10,
    }),
    log: ["error"],
  });
}

/**
 * Empties every application table in one statement.
 *
 * TRUNCATE ... CASCADE is dramatically faster than deleting per-model in FK
 * order, and it cannot be defeated by adding a new model later — the table list
 * is read from the catalog, not hardcoded. `_prisma_migrations` is preserved so
 * the schema does not have to be re-applied between tests.
 */
export async function resetDatabase(client: PrismaClient): Promise<void> {
  const tables = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");

  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
