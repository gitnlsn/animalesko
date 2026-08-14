import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import type { NextConfig } from "next";

/**
 * The workspace keeps a single .env at the repo root so both apps, the Prisma
 * CLI and the test suite read the same values. Next only looks inside its own
 * project directory, so load it here — next.config.ts is evaluated before any
 * application module.
 *
 * `override: false` means real platform variables (Vercel, CI) always win.
 */
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const file of [".env.local", ".env"]) {
  loadDotenv({ path: path.join(workspaceRoot, file), override: false, quiet: true });
}

const config: NextConfig = {
  reactStrictMode: true,

  // Blob URLs are the one remote host next/image is allowed to optimise. Also
  // needed by apps/app, which renders the same listing photos.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },

  // Workspace packages are published as TypeScript source, so Next compiles
  // them itself instead of expecting pre-built JavaScript.
  transpilePackages: ["@animalesko/api", "@animalesko/auth", "@animalesko/db", "@animalesko/ui"],

  // Prisma's client and the pg driver must stay external: bundling them breaks
  // their dynamic requires and Node built-in usage.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default config;
