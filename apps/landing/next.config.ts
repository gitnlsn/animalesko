import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import type { NextConfig } from "next";

/**
 * Same reasoning as apps/app: the workspace keeps a single .env at the repo
 * root, and Next only looks inside its own project directory.
 *
 * `override: false` means real platform variables (Vercel, CI) always win.
 */
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
for (const file of [".env.local", ".env"]) {
  loadDotenv({ path: path.join(workspaceRoot, file), override: false, quiet: true });
}

/**
 * Headers that a marketing site wants on every response.
 *
 * These are here rather than in vercel.json so `next start` and `next dev`
 * behave like production — a redirect or a missing `X-Robots-Tag` is exactly
 * the class of bug that only shows up once a crawler has already indexed the
 * wrong thing.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const config: NextConfig = {
  reactStrictMode: true,

  // Nothing about the landing page benefits from advertising the framework.
  poweredByHeader: false,

  // A canonical URL has to be one string. Next's default is already
  // "no trailing slash"; stating it keeps the sitemap, the canonical tag and
  // the actual route in agreement if the default ever moves.
  trailingSlash: false,

  // Every photo is committed under public/, so no remote patterns are needed.
  // AVIF first: the source images came out of Framer as AVIF already, and the
  // hero is the LCP element on every device.
  images: {
    formats: ["image/avif", "image/webp"],
    // The landing art is fixed; these are the widths the layout actually asks
    // for. A shorter list means fewer variants built and cached.
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
