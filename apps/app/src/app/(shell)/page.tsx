import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { HomeView } from "@animalesko/features/home-view";
import { HOME_RECENT_LISTINGS_INPUT } from "@animalesko/features/query-inputs";
import { getQueryClient, trpc } from "~/trpc/server.ts";

/**
 * Início — the prototype's `home` tab.
 *
 * Everything on it comes from Postgres: the featured animal, the two stat cards
 * ("1.2k pets adotados", "350+ agendamentos" in the prototype) and the
 * recent-pets strip. `HomeView` issues those three queries itself and is shared
 * with the native bundle, which has no server to prefetch from; here they are
 * resolved first and handed over already populated, so the page has no request
 * waterfall and renders no skeleton.
 *
 * `fetchQuery` rather than `prefetchQuery`: a failing query should surface as
 * the error page, not as a silently empty home screen.
 */
export default async function HomePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.fetchQuery(trpc.catalog.petOfTheDay.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.stats.queryOptions()),
    queryClient.fetchQuery(trpc.catalog.listings.queryOptions(HOME_RECENT_LISTINGS_INPUT)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeView />
    </HydrationBoundary>
  );
}
