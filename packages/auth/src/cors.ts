import { trustedOrigins } from "./index.ts";

/**
 * Cross-origin access for the native app.
 *
 * The two web apps call their own API same-origin and never involve CORS. The
 * Capacitor build cannot: its bundle is served from `capacitor://localhost`
 * (iOS) or `https://localhost` (Android), so every call is cross-origin.
 *
 * Shared by /api/auth and /api/trpc rather than written twice. They have to
 * agree on the allow-list, and the failure mode when they drift is silent —
 * the preflight answers 204 and the browser then drops the real request, so
 * the server log shows a tidy 204 and nothing else.
 */

/**
 * Response headers that a cross-origin caller is allowed to *read*.
 *
 * `set-auth-token` is the whole reason this exists. Only a handful of response
 * headers are exposed to cross-origin JavaScript by default, and a custom one
 * is not among them — so without this the bearer plugin mints a token, sends
 * it, and the client silently cannot see it. Sign-in appears to succeed and the
 * device stays signed out.
 */
const EXPOSED = "set-auth-token";

export function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");

  // Echoed from the allow-list rather than answered with `*`:
  // `Access-Control-Allow-Credentials` and a wildcard are mutually exclusive,
  // and the browser build still authenticates with a cookie.
  if (origin && trustedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    headers.set("access-control-expose-headers", EXPOSED);
    // Anything cached against one origin would otherwise be served to another.
    headers.set("vary", "origin");
  }

  return headers;
}

/**
 * Answers a preflight.
 *
 * The allowed request headers are echoed rather than hard-coded. A fixed list
 * has to name every header the client decides to send, and missing one fails in
 * the least helpful way available — `trpc-accept` from `httpBatchStreamLink`
 * was exactly that. Echoing is safe because the origin has already been checked;
 * a request header cannot grant access on its own.
 */
export function preflight(request: Request, methods: string): Response {
  const headers = corsHeaders(request);

  headers.set("access-control-allow-methods", methods);
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? "authorization, content-type",
  );
  headers.set("access-control-max-age", "86400");
  headers.append("vary", "access-control-request-headers");

  return new Response(null, { status: 204, headers });
}

/** Copies the CORS headers onto a response the handler already produced. */
export function withCors(response: Response, request: Request): Response {
  for (const [key, value] of corsHeaders(request)) {
    response.headers.set(key, value);
  }
  return response;
}
