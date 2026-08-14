"use client";

// `import type` and not `import { type … }`: under verbatimModuleSyntax the
// latter leaves a side-effect import behind, which would drag the routers —
// and therefore Prisma and pg — into the browser bundle.
import type { PlusRouter } from "@animalesko/api/plus";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useState } from "react";
import superjson from "superjson";

import { createQueryClient } from "./query-client.ts";

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<PlusRouter>();

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  // Server: a fresh client per request, so one user's data can never be
  // served to another. Browser: one shared client for the tab's lifetime.
  if (typeof window === "undefined") return createQueryClient();
  return (browserQueryClient ??= createQueryClient());
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_PLUS_URL) return process.env.NEXT_PUBLIC_PLUS_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3001";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<PlusRouter>({
      links: [
        loggerLink({
          enabled: (op) =>
            process.env.NODE_ENV === "development" ||
            (op.direction === "down" && op.result instanceof Error),
        }),
        httpBatchStreamLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
