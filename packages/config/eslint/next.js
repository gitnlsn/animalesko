import globals from "globals";

import { reactConfig } from "./react.js";

/** @type {import("eslint").Linter.Config[]} */
export const nextConfig = [
  ...reactConfig,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
];

export default nextConfig;
