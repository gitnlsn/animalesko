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

  // Blob URLs are what users actually upload. `images.unsplash.com` is there
  // for `pnpm db:seed` only: the demonstration data references stock photos, and
  // without the host on this list next/image refuses to optimise them and every
  // card falls back to the same placeholder. It is safe to drop once the
  // database has been handed over with `pnpm db:cleanup`.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },

  // Workspace packages are published as TypeScript source, so Next compiles
  // them itself instead of expecting pre-built JavaScript.
  transpilePackages: ["@animalesko/api", "@animalesko/auth", "@animalesko/db", "@animalesko/ui"],

  // Prisma's client and the pg driver must stay external: bundling them breaks
  // their dynamic requires and Node built-in usage.
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
};

export default config;
