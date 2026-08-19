"use client";

import { useSession } from "@animalesko/features";
import { AppHeader } from "@animalesko/features/app-header";
import { BottomNav } from "@animalesko/features/bottom-nav";
import {
  ADOPTION_PAGE_LIMIT,
  HOME_RECENT_LISTINGS_INPUT,
  SERVICES_DEFAULT_TYPE,
  SERVICES_PAGE_LIMIT,
} from "@animalesko/features/query-inputs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useTRPC } from "~/trpc/react.tsx";

/**
 * The four-tab shell, matching the web app's `(shell)` layout.
 *
 * The web version is an async Server Component that reads the session from
 * `headers()`. Here the session already sits in context — `MobileProviders`
 * fills it from the token in secure storage — so this is a plain client
 * component that reads it back out.
 *
 * `pb-24` leaves room for the fixed bottom nav, which adds
 * `env(safe-area-inset-bottom)` of its own on a notched device.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  const { signedIn, resolving } = useSession();

  usePrefetchTabs();

  return (
    <div className="min-h-dvh bg-background">
      {/* `resolving` and not just `signedIn`: false is also what an unresolved
          session looks like, and rendering signed-out chrome to someone who is
          signed in means the notification bell appears, or changes, a moment
          after the page settles. */}
      <AppHeader signedIn={signedIn} resolving={resolving} />

      <main className="mx-auto max-w-md pb-24">
        <div className="p-4">{children}</div>
      </main>

      <BottomNav />
    </div>
  );
}

/**
 * Warms the other tabs' queries once the current screen has settled.
 *
 * A tab switch is one tap and there is no server prefetch on this host, so
 * every tab but the one you landed on starts cold and opens on a skeleton. The
 * inputs come from `query-inputs` rather than being written out again: a tRPC
 * key is derived from its input, so a prefetch that differs by one field warms
 * a key nothing ever reads.
 *
 * Deliberately after first paint. Issued during mount these would share a
 * batch — and the connection — with the request the visible screen is waiting
 * on, which trades a fast tab switch for a slow arrival.
 */
function usePrefetchTabs(): void {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  useEffect(() => {
    const warm = () => {
      // `prefetchQuery` honours the client's `staleTime` and dedupes against an
      // in-flight fetch, so the tab already on screen costs nothing here and a
      // cache restored from the last launch is refreshed rather than refetched
      // from scratch. It also swallows errors: a warm-up that fails must not
      // surface anywhere.
      //
      // One call per query rather than a loop over an array: these five return
      // different shapes, and collecting them into an array literal unifies the
      // element type to whichever came first — which then reads as every other
      // entry being the wrong type.
      void queryClient.prefetchQuery(trpc.catalog.petOfTheDay.queryOptions());
      void queryClient.prefetchQuery(trpc.catalog.stats.queryOptions());
      void queryClient.prefetchQuery(
        trpc.catalog.listings.queryOptions(HOME_RECENT_LISTINGS_INPUT),
      );
      void queryClient.prefetchQuery(
        trpc.catalog.listings.queryOptions({ limit: ADOPTION_PAGE_LIMIT }),
      );
      void queryClient.prefetchQuery(
        trpc.catalog.offerings.queryOptions({
          type: SERVICES_DEFAULT_TYPE,
          limit: SERVICES_PAGE_LIMIT,
        }),
      );
    };

    // Idle rather than a timer where the WebView supports it — the point is to
    // take the main thread only once the arriving screen has stopped needing
    // it. The timeout keeps a busy device from postponing this indefinitely.
    if (typeof requestIdleCallback === "function") {
      const handle = requestIdleCallback(warm, { timeout: 3000 });
      return () => cancelIdleCallback(handle);
    }

    const timer = setTimeout(warm, 1000);
    return () => clearTimeout(timer);
  }, [trpc, queryClient]);
}
