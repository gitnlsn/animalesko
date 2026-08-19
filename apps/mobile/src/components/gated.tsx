"use client";

import { ListSkeleton, PageHeaderSkeleton } from "@animalesko/ui";

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
 *
 * That window is immediately followed by a second one — the screen's own query
 * — and two placeholders of different shapes in a row read as the page being
 * built twice. `skeleton` is how a screen collapses the two into one: it passes
 * the placeholder its own pending state is about to show anyway.
 */
export function Gated({
  next,
  skeleton,
  children,
}: {
  /**
   * Where to send the user back to once they sign in. Defaults to wherever they
   * already are, query string included: `/pagamento?agendamento=…` returned to
   * a literal `/historico` has thrown away the one thing the deep link carried.
   */
  next?: string;
  /** Shown while the session resolves. Defaults to the header-and-list shape
   * the secondary screens share. */
  skeleton?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { checking, signedIn } = useRequireSession(next ?? currentUrl());

  if (checking || !signedIn) {
    return <>{skeleton ?? <GateSkeleton />}</>;
  }

  return <>{children}</>;
}

function GateSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="mx-auto max-w-md p-4">
        <ListSkeleton count={3} />
      </div>
    </>
  );
}

/**
 * The current location, read off `window` rather than through
 * `useSearchParams`.
 *
 * That hook forces a Suspense boundary onto every route that renders it under
 * `output: "export"`, and these pages have none — they prerender precisely
 * because this gate withholds their children, so nothing below it ever runs at
 * build time. The build-time fallback is therefore never the value a device
 * uses: the redirect can only happen after hydration.
 */
function currentUrl(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search;
}
