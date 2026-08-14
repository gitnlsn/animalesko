import "server-only";

import { plusRouter, createTRPCContext } from "@animalesko/api";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { cache } from "react";

import { createQueryClient } from "./query-client.ts";

/**
 * Server-side caller. Server Components can prefetch through this and hand the
 * result to the client via hydration — no HTTP round-trip, no waterfall.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return createTRPCContext({ headers: heads });
});

// One query client per request, memoised so every prefetch in a single render
// writes into the same cache that gets dehydrated.
export const getQueryClient = cache(createQueryClient);

export const trpc = createTRPCOptionsProxy({
  ctx: createContext,
  router: plusRouter,
  queryClient: getQueryClient,
});
