import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { ListingsPanel } from "~/components/listings-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Adoção" };

export default async function ListingsPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.listing.list.queryOptions({ limit: 100 })),
    queryClient.prefetchQuery(trpc.listing.applications.queryOptions({})),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListingsPanel />
    </HydrationBoundary>
  );
}
