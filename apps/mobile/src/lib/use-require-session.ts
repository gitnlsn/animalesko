"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { authClient } from "./auth-client.ts";

/**
 * Client-side counterpart of the web app's `requireSession`.
 *
 * The web version redirects on the server, before any markup exists. There is
 * no server here, so the redirect happens after the first paint — which is why
 * this returns a `checking` flag rather than just firing an effect: a gated
 * screen has to render a placeholder while the session resolves, or an
 * authenticated user sees their own page flash through the sign-in screen on
 * every cold start.
 */
export function useRequireSession(next: string): { checking: boolean; signedIn: boolean } {
  const router = useRouter();
  const session = authClient.useSession();

  const signedIn = Boolean(session.data?.user);
  const checking = session.isPending;

  useEffect(() => {
    if (checking || signedIn) return;
    router.replace(`/entrar?next=${encodeURIComponent(next)}`);
  }, [checking, signedIn, next, router]);

  return { checking, signedIn };
}
