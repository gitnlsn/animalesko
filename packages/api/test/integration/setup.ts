import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..", "..", "..", "..");

loadDotenv({ path: path.join(workspaceRoot, ".env"), override: false, quiet: true });

/**
 * Per-worker environment wiring. Runs once per test file, before that file's
 * modules are imported.
 *
 * Migrations are *not* applied here — that happens once in `global-setup.ts`.
 * Doing it per file would mean one `prisma migrate deploy` per file running
 * concurrently.
 */
const testUrl = process.env.TEST_DATABASE_URL;

if (!testUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Run `pnpm db:up` and copy .env.example to .env.");
}

// Point every consumer of DATABASE_URL at the test database for this worker.
process.env.DATABASE_URL = testUrl;
process.env.DIRECT_DATABASE_URL = testUrl;
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret";
process.env.NODE_ENV = "test";
