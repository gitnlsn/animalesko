/**
 * `pnpm db:seed` — populate the database for a UI review.
 *
 * Two layers: reference data every deployment needs (badges, and an
 * administrator when ADMIN_EMAIL/ADMIN_PASSWORD are set), and a demonstration
 * population of roughly five thousand rows built so that no screen in either
 * application renders an empty state for want of data.
 *
 * Destructive: the demo layer truncates before writing. See prisma/seed/run.ts
 * for why, and prisma/seed/target.ts for the guard that stops it happening to a
 * remote database by accident.
 *
 * `--reference-only` applies just the first layer, which is what production
 * needs after `pnpm db:cleanup`.
 */
// Must precede any import that reads process.env.
import "../src/load-env.ts";

import { run } from "./seed/run.ts";

const referenceOnly = process.argv.includes("--reference-only");

try {
  process.exitCode = await run({ referenceOnly });
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
