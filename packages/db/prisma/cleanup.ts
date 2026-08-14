/**
 * `pnpm db:cleanup` — remove the demonstration data and hand the database over.
 *
 * Empties every application table, then re-applies the reference layer: the
 * four badges, plus one administrator if ADMIN_EMAIL and ADMIN_PASSWORD are
 * set. Nothing else survives — no demo accounts, no known passwords, no seeded
 * animals — and the script verifies that with COUNT(*) before it reports
 * success.
 *
 * Guarded by the same SEED_CONFIRM check the seed uses; see
 * prisma/seed/target.ts.
 */
// Must precede any import that reads process.env.
import "../src/load-env.ts";

import { cleanup } from "./seed/cleanup.ts";

try {
  process.exitCode = await cleanup();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
