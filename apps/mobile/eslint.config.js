import { nextConfig } from "@animalesko/config/eslint/next";

/**
 * The shared preset ignores `.next`, which is where the other two apps put
 * their build. This one also produces `out/` (the static export) and then
 * `cap sync` copies that into both native projects — all of it minified bundle
 * output that ESLint would otherwise report a few thousand findings on.
 */
export default [...nextConfig, { ignores: ["out/**", "ios/**", "android/**"] }];
