import { createTRPCContext, plusRouter } from "@animalesko/api";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import type { NextRequest } from "next/server";

/**
 * The provider app's tRPC endpoint. It mounts `plusRouter` only — the consumer
 * catalog procedures live on the other deployment.
 */
function handler(request: NextRequest) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: plusRouter,
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
