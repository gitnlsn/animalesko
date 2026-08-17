import { appRouter, createTRPCContext } from "@animalesko/api";
import { preflight, withCors } from "@animalesko/auth/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { NextRequest } from "next/server";

/**
 * Preflight for the native app. See @animalesko/auth/cors for why this is
 * needed at all and why the allow-list lives next to Better Auth's.
 */
function OPTIONS(request: NextRequest): Response {
  return preflight(request, "GET, POST, OPTIONS");
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

  return withCors(response, request);
}

export { handler as GET, handler as POST, OPTIONS };
