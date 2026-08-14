import path from "node:path";

import { defineConfig, env } from "prisma/config";

// The repo keeps one .env at the workspace root rather than one per package.
import "./src/load-env.js";

export default defineConfig({
  // Multi-file schema: prisma/schema/*.prisma.
  schema: path.join("prisma", "schema"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations must talk to Postgres directly. Locally DIRECT_DATABASE_URL
    // equals DATABASE_URL; on Vercel, DATABASE_URL points at a pooler that
    // cannot run DDL, so the direct URL is what belongs here.
    url: env("DIRECT_DATABASE_URL"),
  },
});
