"use client";

import { customSessionClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { Auth } from "./index.ts";

/**
 * Browser-side auth client. Both apps import this; each passes its own origin
 * so the requests land on that app's own /api/auth route.
 *
 * In the browser the live origin always wins over the passed fallback: the
 * fallback comes from a NEXT_PUBLIC_* variable inlined at build time, so if it
 * is unset or stale the client would post credentials at the wrong host.
 */
export function createAnimaleskoAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL: typeof window === "undefined" ? baseURL : window.location.origin,
    // Mirrors the server's customSession plugin so `session.data.organizations`
    // and `.roles` are typed on the client instead of being `unknown`.
    plugins: [customSessionClient<Auth>()],
  });
}

export type AnimaleskoAuthClient = ReturnType<typeof createAnimaleskoAuthClient>;
