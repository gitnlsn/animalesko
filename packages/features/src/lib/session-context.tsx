"use client";

import { createContext, useContext, useMemo } from "react";

export interface ClientSession {
  signedIn: boolean;
  userId: string | null;
  name: string | null;
  /**
   * True while the answer is still being worked out, which only ever happens in
   * the native build: there the session comes from a token in secure storage
   * plus a round trip to the API, so there is a real window where nobody knows
   * yet. The two web apps resolve it on the server before any markup exists and
   * leave this unset.
   *
   * The distinction matters because `signedIn: false` was doing double duty for
   * "signed out" and "don't know yet". A signed-in user opening the app got the
   * signed-out treatment for the length of that round trip — a bare
   * notification bell, "Entre para ver suas notificações", every heart drawn
   * hollow — and then watched it all correct itself.
   */
  resolving?: boolean;
}

const SessionContext = createContext<ClientSession>({
  signedIn: false,
  userId: null,
  name: null,
});

/**
 * Whether *this* visitor is signed in, resolved once on the server.
 *
 * Client components need it constantly — a heart button either favourites or
 * bounces to `/entrar`, a query is either enabled or skipped — and threading a
 * `signedIn` prop through every card would be noise. Deliberately carries only
 * the three fields the UI branches on: it is not an auth check, and nothing
 * server-side ever trusts it.
 */
export function SessionProvider({
  value,
  children,
}: {
  value: ClientSession;
  children: React.ReactNode;
}) {
  return <SessionContext value={value}>{children}</SessionContext>;
}

/**
 * `resolving` is normalised to a real boolean here so callers can branch on it
 * without every one of them having to remember that an absent value means "no".
 */
export function useSession(): ClientSession & { resolving: boolean } {
  const session = useContext(SessionContext);

  return useMemo(() => ({ ...session, resolving: session.resolving ?? false }), [session]);
}
