import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import type { NextConfig } from "next";

/**
 * Same workspace .env as the two web apps — see apps/app/next.config.ts for why
 * it is loaded here rather than by Next itself.
 */
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const file of [".env.local", ".env"]) {
  loadDotenv({ path: path.join(workspaceRoot, file), override: false, quiet: true });
}

const config: NextConfig = {
  reactStrictMode: true,

  /**
   * The native bundle is a folder of files inside the .ipa/.aab, not a server.
   *
   * `export` therefore removes every server capability at build time, which is
   * a feature here: it makes a Server Component or a `headers()` call a build
   * error rather than something that fails on a device. Nothing in this app has
   * a server to fall back on — the API lives in apps/app on Vercel.
   */
  output: "export",

  /**
   * Emits `/adocao/index.html` instead of `/adocao.html`. Capacitor serves the
   * bundle through a local static server that resolves a directory to its
   * index, so this is what makes a deep link to /adocao work offline.
   */
  trailingSlash: true,

  images: {
    // Vercel's optimizer is a server route, and a bundled app cannot reach it —
    // least of all offline. The photos are already remote Blob URLs sized by
    // the uploader, so they are used as-is.
    unoptimized: true,
  },

  // `@animalesko/db` is deliberately absent: nothing in a mobile bundle may
  // import Prisma, and leaving it out turns an accidental import into a
  // resolution error instead of a 40 MB bundle.
  transpilePackages: [
    "@animalesko/api",
    "@animalesko/auth",
    "@animalesko/features",
    "@animalesko/ui",
  ],
};

export default config;
