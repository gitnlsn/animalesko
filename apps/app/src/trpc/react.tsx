"use client";

// `import type` and not `import { type … }`: under verbatimModuleSyntax the
// latter leaves a side-effect import behind, which would drag the routers —
// and therefore Prisma and pg — into the browser bundle.
import type { AppRouter } from "@animalesko/api/app";

import { AuthClientProvider, TRPCProvider } from "@animalesko/features";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink, loggerLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { authClient } from "~/lib/auth-client.ts";
import { createQueryClient } from "./query-client.ts";

// `useTRPC` is re-exported so the app's own modules keep a single import site,
// but the context itself lives in @animalesko/features — the shared components
// and this provider have to be talking about the same React context.
export { useTRPC, useTRPCClient } from "@animalesko/features";

let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  // Server: a fresh client per request, so one user's data can never be
  // served to another. Browser: one shared client for the tab's lifetime.
  if (typeof window === "undefined") return createQueryClient();
  return (browserQueryClient ??= createQueryClient());
}

/**
 * Whether a down-message carries an UNAUTHORIZED error.
 *
 * `loggerLink` routes any errored response through `console.error`, and Next's
 * dev overlay promotes every `console.error` into a red "Console Error" card.
 * A protected query losing its cookie mid-session is an expected outcome the
 * UI already handles, so it should not read as a defect. Everything else — a
 * genuine 500, a FORBIDDEN we did not anticipate — still logs.
 *
 * `TRPCClientError` exposes the error's `data` directly; a streamed envelope
 * nests it under `result.error`, so both shapes are checked.
 */
function isUnauthorized(result: unknown): boolean {
  if (typeof result !== "object" || result === null) return false;

  const candidate = result as {
    data?: { code?: string };
    result?: { error?: { data?: { code?: string } } };
  };

  return (
    candidate.data?.code === "UNAUTHORIZED" ||
    candidate.result?.error?.data?.code === "UNAUTHORIZED"
  );
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: [
        loggerLink({
          enabled: (op) => {
            if (op.direction === "down" && isUnauthorized(op.result)) return false;

            return (
              process.env.NODE_ENV === "development" ||
              (op.direction === "down" && op.result instanceof Error)
            );
          },
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
        <AuthClientProvider client={authClient}>{children}</AuthClientProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}
