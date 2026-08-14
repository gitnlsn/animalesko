import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "./generated/client.ts";
import { truncateAllTables } from "./reset.ts";

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
 * Empties every application table, preserving `_prisma_migrations`.
 *
 * The implementation lives in ./reset.ts because the seed and cleanup scripts
 * need the same statement and must not import a module documented as
 * test-only. Nothing else changed: this is still the suite's entry point.
 */
export async function resetDatabase(client: PrismaClient): Promise<void> {
  await truncateAllTables(client);
}
