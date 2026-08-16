"use client";

import { Skeleton } from "@animalesko/ui";

import { useRequireSession } from "~/lib/use-require-session.ts";

/**
 * Client-side replacement for the web app's server `requireSession` gate.
 *
 * The placeholder matters more than it looks. Resolving the session means
 * reading a token out of the Keychain and asking the API about it, so on a cold
 * start there is a real window where we do not yet know who this is. Rendering
 * the children during that window would show a signed-in screen to a signed-out
 * user for a frame; rendering the sign-in screen would flash it at everyone
 * else. So neither renders until the answer arrives.
 */
export function Gated({ next, children }: { next: string; children: React.ReactNode }) {
  const { checking, signedIn } = useRequireSession(next);

  if (checking || !signedIn) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return <>{children}</>;
}
