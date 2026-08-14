import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

/**
 * The workspace keeps a single .env at the repo root so both apps, the Prisma
 * CLI and the integration suite read the same values. Next.js finds it on its
 * own; the Prisma CLI and plain `tsx` scripts do not, so they import this.
 *
 * Anything already present in process.env wins — CI and Vercel set real values
 * and must never be overridden by a stray local file.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(here, "..", "..", "..");

for (const file of [".env.local", ".env"]) {
  const candidate = path.join(workspaceRoot, file);
  if (existsSync(candidate)) {
    loadDotenv({ path: candidate, override: false, quiet: true });
  }
}

export {};
