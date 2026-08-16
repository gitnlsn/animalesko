import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { ServicesBrowser } from "@animalesko/features/services-browser";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Serviços",
  description: "Pet sitter, dog walker, creche e hotel para o seu companheiro.",
};

/**
 * Serviços — the prototype's `services` tab.
 *
 * Only the first tab is prefetched. The other three are one click away and
 * fetch on demand, which keeps the initial payload to what is actually shown.
 */
export default async function ServicesPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(
    trpc.catalog.offerings.queryOptions({ type: "PET_SITTER", limit: 50 }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ServicesBrowser />
    </HydrationBoundary>
  );
}
