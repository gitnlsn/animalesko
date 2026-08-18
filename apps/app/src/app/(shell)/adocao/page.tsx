import { listingSearchParamsSchema } from "@animalesko/api/schemas";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { Suspense } from "react";

import { AdoptionView } from "@animalesko/features/adoption-view";
import { ADOPTION_PAGE_LIMIT } from "@animalesko/features/query-inputs";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adoção",
  description: "Pets disponíveis para adoção responsável na Animalesko.",
};

/**
 * Adoção — the prototype's `adoption` tab.
 *
 * The filters live in the URL, so they are read here as search params and the
 * feed is queried from the database rather than an array being filtered in the
 * browser. That is what makes a filtered view shareable and the feed indexable.
 *
 * `AdoptionView` parses the same params again from `useSearchParams`, because
 * the native bundle has no server to do it. Parsing twice is what lets one
 * component serve both hosts; the schema's per-field `.catch` keeps a
 * hand-edited URL degrading to the unfiltered feed on either side.
 *
 * The `Suspense` boundary is what a statically exported `useSearchParams`
 * requires. It is redundant on this host and kept anyway, so the two pages stay
 * the same shape.
 */
export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const filters = listingSearchParamsSchema.parse(raw);

  const queryClient = getQueryClient();
  await queryClient.fetchQuery(
    trpc.catalog.listings.queryOptions({ ...filters, limit: ADOPTION_PAGE_LIMIT }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <AdoptionView />
      </Suspense>
    </HydrationBoundary>
  );
}
