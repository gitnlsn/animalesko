"use client";

// `import type` and not `import { type … }`: under verbatimModuleSyntax the
// latter leaves a side-effect import behind, which would drag the routers —
// and therefore Prisma and pg — into the browser bundle.
import type { AppRouter } from "@animalesko/api/app";

import { createTRPCContext } from "@trpc/tanstack-react-query";

/**
 * The one tRPC React context, shared by every host.
 *
 * This has to live in exactly one module. `createTRPCContext` mints a React
 * context object, and a component calling `useTRPC` only sees a provider that
 * was created from the *same* call — two hosts each making their own would
 * hand the shared components a context no provider ever filled.
 *
 * What differs per host is the *client*, not the context: the web apps talk to
 * a same-origin /api/trpc with cookies, while the native bundle talks to an
 * absolute URL with a bearer token. So each host builds its own
 * `createTRPCClient` and passes it to this `TRPCProvider`.
 */
export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
