import { appRouter, createTRPCContext } from "@animalesko/api";
import { trustedOrigins } from "@animalesko/auth";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { NextRequest } from "next/server";

/**
 * Cross-origin access for the native app.
 *
 * The web apps call this same-origin and never involve CORS at all. The
 * Capacitor build cannot: its bundle is served from `capacitor://localhost`
 * (iOS) or `http://localhost` (Android), so every tRPC call is cross-origin and
 * the WebView sends a preflight first. Without these headers the preflight
 * succeeds and the *actual* request is then dropped by the WebView — the API
 * logs a tidy 204 and the app renders empty states, which is a genuinely
 * horrible thing to debug.
 *
 * The origin is echoed from an allow-list rather than answered with `*`:
 * `Access-Control-Allow-Credentials` and a wildcard are mutually exclusive, and
 * the browser build still authenticates with a cookie.
 */
function corsHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const origin = request.headers.get("origin");

  if (origin && trustedOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-credentials", "true");
    // Anything cached against the wrong origin would be served to the other.
    headers.set("vary", "origin");
  }

  return headers;
}

/**
 * Preflight.
 *
 * The allowed headers are echoed from `Access-Control-Request-Headers` rather
 * than hard-coded. A fixed list looks safer and is not: it has to name every
 * header tRPC decides to send, and missing one fails in the least helpful way
 * available — the preflight answers 204, the browser then silently drops the
 * real request, and the server log shows a clean OPTIONS with no GET after it.
 * `httpBatchStreamLink` alone sends `trpc-accept`, which is exactly the header
 * a hand-written list forgets.
 *
 * Echoing is safe because the origin has already been checked against the
 * allow-list: nothing gets here that was not going to be allowed anyway, and a
 * request header cannot grant access on its own.
 */
function OPTIONS(request: NextRequest): Response {
  const headers = corsHeaders(request);
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set(
    "access-control-allow-headers",
    request.headers.get("access-control-request-headers") ?? "authorization, content-type",
  );
  headers.set("access-control-max-age", "86400");

  // The response varies by the requested headers now, not just by origin.
  headers.append("vary", "access-control-request-headers");

  return new Response(null, { status: 204, headers });
}

/**
 * The consumer app's tRPC endpoint. It mounts `appRouter` only — the provider
 * procedures in `plusRouter` are not reachable from this deployment at all.
 */
async function handler(request: NextRequest): Promise<Response> {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: request.headers }),
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`tRPC failed on ${path ?? "<no-path>"}: ${error.message}`);
          }
        : undefined,
  });

  for (const [key, value] of corsHeaders(request)) {
    response.headers.set(key, value);
  }

  return response;
}

export { handler as GET, handler as POST, OPTIONS };
