"use client";

import { createContext, useContext } from "react";

export interface ClientSession {
  signedIn: boolean;
  userId: string | null;
  name: string | null;
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

export function useSession(): ClientSession {
  return useContext(SessionContext);
}
