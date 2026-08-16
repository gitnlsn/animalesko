"use client";

import { createContext, useContext } from "react";

import type { AnimaleskoAuthClient } from "@animalesko/auth/client";

/**
 * The host's Better Auth client, handed to the shared components.
 *
 * Only two components need it — the sign-in form and the profile panel's
 * sign-out button — but they cannot construct it themselves: the web apps point
 * at their own live origin and authenticate with cookies, while the native
 * bundle pins an absolute API URL and carries a bearer token out of the
 * Keychain. Injecting the built client keeps that difference in the host and
 * out of the components.
 */
const AuthClientContext = createContext<AnimaleskoAuthClient | null>(null);

export function AuthClientProvider({
  client,
  children,
}: {
  client: AnimaleskoAuthClient;
  children: React.ReactNode;
}) {
  return <AuthClientContext value={client}>{children}</AuthClientContext>;
}

export function useAuthClient(): AnimaleskoAuthClient {
  const client = useContext(AuthClientContext);

  // Throwing beats returning null: a missing provider is a wiring mistake in
  // the host, and the alternative is a sign-in button that silently does
  // nothing.
  if (!client) {
    throw new Error("useAuthClient must be used within an AuthClientProvider.");
  }

  return client;
}
