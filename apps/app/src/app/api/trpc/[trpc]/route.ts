import { appRouter, createTRPCContext } from "@animalesko/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { NextRequest } from "next/server";

/**
 * The consumer app's tRPC endpoint. It mounts `appRouter` only — the provider
 * procedures in `plusRouter` are not reachable from this deployment at all.
 */
function handler(request: NextRequest) {
  return fetchRequestHandler({
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
}

export { handler as GET, handler as POST };
