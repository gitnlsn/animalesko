import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "./index.ts";

/**
 * Route handlers for `app/api/auth/[...all]/route.ts`.
 *
 * Exported from here so neither app needs a direct better-auth dependency —
 * the auth library stays an implementation detail of this package.
 */
export const { GET, POST } = toNextJsHandler(auth);
