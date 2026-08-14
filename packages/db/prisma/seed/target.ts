import { createPrismaClient } from "../../src/index.ts";

import type { PrismaClient } from "../../src/index.ts";

/**
 * Where the seed and the cleanup are about to write, and whether they are
 * allowed to.
 *
 * Both scripts are destructive — they TRUNCATE before doing anything else — and
 * both are meant to be run against production at least once, during the review
 * that precedes launch. So the guard cannot be "refuse anything remote"; it has
 * to be "refuse anything remote that was not named explicitly".
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

export interface SeedTarget {
  /** Connection string the client was built from. */
  url: string;
  host: string;
  database: string;
  /** False for anything that is not plainly a developer machine. */
  isLocal: boolean;
}

export function describeTarget(url: string): SeedTarget {
  const parsed = new URL(url);
  const host = parsed.hostname;

  return {
    url,
    host,
    database: parsed.pathname.replace(/^\//, ""),
    isLocal: LOCAL_HOSTS.has(host),
  };
}

/**
 * Resolves the target and throws unless the operator has confirmed it.
 *
 * Migrations use DIRECT_DATABASE_URL rather than DATABASE_URL because on Neon
 * the latter points at a pooler; the same applies here — the seed writes
 * thousands of rows in a handful of statements and has no reason to go through
 * PgBouncer.
 */
export function resolveTarget(options: { operation: string }): SeedTarget {
  const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Neither DIRECT_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env and run `pnpm db:up`.",
    );
  }

  const target = describeTarget(url);

  // The integration suite owns this database and truncates it between runs;
  // pointing the seed at it would fight that, and a mistyped variable is the
  // likeliest way to arrive here.
  const testUrl = process.env.TEST_DATABASE_URL;
  if (testUrl && describeTarget(testUrl).database === target.database && !target.isLocal) {
    throw new Error(
      `Refusing to ${options.operation} "${target.database}": it is TEST_DATABASE_URL, which the integration suite owns.`,
    );
  }

  if (!target.isLocal && process.env.SEED_CONFIRM !== target.database) {
    throw new Error(
      [
        `Refusing to ${options.operation} "${target.database}" on ${target.host}.`,
        "",
        "This is not a local database and this command destroys every row in it.",
        `If that is what you want, re-run with SEED_CONFIRM=${target.database}.`,
      ].join("\n"),
    );
  }

  return target;
}

export function createTargetClient(target: SeedTarget): PrismaClient {
  return createPrismaClient(target.url);
}

/**
 * Exact counts for the tables named, via COUNT(*).
 *
 * `pg_stat_user_tables.n_live_tup` is the cheap way to do this and it is the
 * wrong one here. It is a planner estimate maintained by autovacuum, so after a
 * truncate-and-reseed it reports the *sum* of every run until the statistics
 * catch up — it happily claimed a thousand payments where there were three
 * hundred. These numbers are printed immediately before the rows are destroyed
 * and are what an operator decides on, so they are counted rather than guessed.
 */
export async function exactCounts(
  client: PrismaClient,
  tables: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  for (const table of tables) {
    const [row] = await client.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "public"."${table}"`,
    );
    counts.set(table, Number(row?.count ?? 0));
  }

  return counts;
}

/** Every table in the public schema with its exact row count, heaviest first. */
export async function tableCounts(
  client: PrismaClient,
): Promise<{ table: string; rows: number }[]> {
  const counts = await exactCounts(client, await listTables(client));

  return [...counts.entries()]
    .map(([table, rows]) => ({ table, rows }))
    .sort((a, b) => b.rows - a.rows || a.table.localeCompare(b.table));
}

/** Names of every table in the public schema, migrations excluded. */
export async function listTables(client: PrismaClient): Promise<string[]> {
  const rows = await client.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename ASC
  `;

  return rows.map((row) => row.tablename);
}

export function printTargetBanner(target: SeedTarget, operation: string): void {
  console.info("");
  console.info(`  ${operation}`);
  console.info(`  host      ${target.host}`);
  console.info(`  database  ${target.database}`);
  console.info(`  mode      ${target.isLocal ? "local" : "REMOTE (confirmed via SEED_CONFIRM)"}`);
  console.info("");
}
