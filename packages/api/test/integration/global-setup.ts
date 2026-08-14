import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..", "..", "..", "..");
const dbPackage = path.join(workspaceRoot, "packages", "db");

/**
 * Runs once for the entire suite, in the main process.
 *
 * Migrations belong here and not in `setupFiles`: setup files execute once per
 * *test file*, so with `fileParallelism` on, that would fire one concurrent
 * `prisma migrate deploy` per file — all contending for the same advisory lock.
 */
export async function setup(): Promise<void> {
  loadDotenv({ path: path.join(workspaceRoot, ".env"), override: false, quiet: true });

  const testUrl = process.env.TEST_DATABASE_URL;

  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Run `pnpm db:up` and copy .env.example to .env.",
    );
  }

  const database = new URL(testUrl).pathname.replace(/^\//, "");
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to migrate "${database}": the integration database name must end in "_test".`,
    );
  }

  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    cwd: dbPackage,
    stdio: "pipe",
    env: { ...process.env, DIRECT_DATABASE_URL: testUrl },
  });
}
