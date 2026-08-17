import { toNextJsHandler } from "better-auth/next-js";

import { preflight, withCors } from "./cors.ts";
import { auth } from "./index.ts";

/**
 * Route handlers for `app/api/auth/[...all]/route.ts`.
 *
 * Exported from here so neither app needs a direct better-auth dependency —
 * the auth library stays an implementation detail of this package.
 *
 * `toNextJsHandler` returns only GET and POST. That is enough for a browser on
 * the same origin, and enough for `get-session`, which is a simple GET the
 * browser sends without asking permission first. It is *not* enough for
 * sign-in: a POST carrying `content-type: application/json` is preflighted, and
 * with no OPTIONS handler the preflight falls through to Next's default, which
 * answers 204 with an `allow:` header and no CORS headers at all. The WebView
 * then drops the sign-in it was about to send, and the only evidence is a
 * successful-looking 204 in the log.
 */
const handlers = toNextJsHandler(auth);

export async function GET(request: Request): Promise<Response> {
  return withCors(await handlers.GET(request), request);
}

export async function POST(request: Request): Promise<Response> {
  return withCors(await handlers.POST(request), request);
}

export function OPTIONS(request: Request): Response {
  return preflight(request, "GET, POST, OPTIONS");
}
