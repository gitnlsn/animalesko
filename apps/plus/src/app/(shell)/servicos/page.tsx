import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { OfferingsPanel } from "~/components/offerings-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.offering.list.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OfferingsPanel />
    </HydrationBoundary>
  );
}
