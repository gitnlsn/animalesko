import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { FavoritesScreen } from "@animalesko/features/favorites-screen";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus Favoritos" };

export default async function FavoritesPage() {
  await requireSession("/favoritos");

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.favorite.listings.queryOptions()),
    queryClient.prefetchQuery(trpc.favorite.offerings.queryOptions()),
    queryClient.prefetchQuery(trpc.favorite.ids.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FavoritesScreen />
    </HydrationBoundary>
  );
}
