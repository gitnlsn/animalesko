"use client";

// `import type` and not `import { type … }`: under verbatimModuleSyntax the
// latter leaves a side-effect import behind, which would drag the routers —
// and therefore Prisma and pg — into the bundle.
import type { AppRouter } from "@animalesko/api/app";

import { AuthClientProvider, SessionProvider, TRPCProvider } from "@animalesko/features";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchStreamLink, loggerLink } from "@trpc/client";
import { useState } from "react";
import superjson from "superjson";

import { NativeBootstrap } from "~/components/native-bootstrap.tsx";
import { PushRegistration } from "~/components/push-registration.tsx";
import { API_URL } from "~/lib/api-url.ts";
import { authClient } from "~/lib/auth-client.ts";
import { tokenStore } from "~/lib/token-store.ts";
import { createQueryClient } from "./query-client.ts";

export { useTRPC, useTRPCClient } from "@animalesko/features";

let clientQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  // `output: "export"` still prerenders these files once at build time, so the
  // server branch is about the build, not a request — but it must stay, or the
  // build shares one cache across every prerendered route.
  if (typeof window === "undefined") return createQueryClient();
  return (clientQueryClient ??= createQueryClient());
}

/**
 * See apps/app/src/trpc/react.tsx — same reasoning, same shape.
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

/**
 * Providers for the whole native app.
 *
 * `SessionProvider` is filled from the auth client rather than from a server
 * component: the shared components read `useSession()` to decide whether a
 * heart favourites or bounces to sign-in, and on the web that value is resolved
 * once on the server. Here there is no server, so it is resolved from the
 * token in secure storage and re-renders when that changes.
 */
export function MobileProviders({ children }: { children: React.ReactNode }) {
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
          url: `${API_URL}/api/trpc`,
          transformer: superjson,

          // The cookie the web build relies on does not exist here. Read the
          // token per request rather than caching it: a sign-in that happens
          // after this client was constructed has to be picked up without
          // rebuilding the link chain.
          headers: async () => {
            const token = await tokenStore.read();
            return token ? { authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <AuthClientProvider client={authClient}>
          <NativeBootstrap />
          <NativeSession>
            <PushRegistration />
            {children}
          </NativeSession>
        </AuthClientProvider>
      </TRPCProvider>
    </QueryClientProvider>
  );
}

function NativeSession({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();

  return (
    <SessionProvider
      value={{
        signedIn: Boolean(session.data?.user),
        userId: session.data?.user.id ?? null,
        name: session.data?.user.name ?? null,
      }}
    >
      {children}
    </SessionProvider>
  );
}
