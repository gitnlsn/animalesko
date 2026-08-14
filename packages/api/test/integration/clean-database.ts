/**
 * Manual escape hatch — `pnpm --filter @animalesko/api test:db:clean`.
 *
 * The integration suite never truncates: every test runs inside a transaction
 * that is rolled back, so nothing is committed and the database stays empty on
 * its own. This script exists for the two cases that break that invariant:
 *
 *   - a database that already had rows before the transaction model was adopted;
 *   - a test that escaped the fixture and committed something.
 *
 * It is deliberately not wired into any test run.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createTestClient, resetDatabase, testDatabaseUrl } from "@animalesko/db/testing";
import { config as loadDotenv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
loadDotenv({
  path: path.join(path.resolve(here, "..", "..", "..", ".."), ".env"),
  override: false,
  quiet: true,
});

// Throws unless the database name ends in `_test`.
const url = testDatabaseUrl();
const db = createTestClient();

try {
  await resetDatabase(db);
  console.info(`Cleaned ${new URL(url).pathname.replace(/^\//, "")}.`);
} finally {
  await db.$disconnect();
}
