import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { FavoritesList } from "~/components/favorites-list.tsx";
import { PageHeader } from "~/components/page-header.tsx";
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
      <PageHeader
        title="Meus favoritos"
        subtitle="Pets e serviços que você guardou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <FavoritesList />
      </main>
    </HydrationBoundary>
  );
}
