import { listingSearchParamsSchema } from "@animalesko/api/schemas";
import { Card } from "@animalesko/ui";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { PawPrint } from "lucide-react";

import { FilterBar } from "@animalesko/features/filter-bar";
import { ListingSearch } from "@animalesko/features/listing-search";
import { PetCard } from "@animalesko/features/pet-card";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adoção",
  description: "Pets disponíveis para adoção responsável na Animalesko.",
};

/**
 * Adoção — the prototype's `adoption` tab.
 *
 * The filters live in the URL, so this reads them as search params and queries
 * the database rather than filtering an array in the browser. That is what
 * makes a filtered view shareable and the feed indexable.
 */
export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;

  // `.catch(undefined)` on each field, so a hand-edited URL degrades to the
  // unfiltered feed instead of throwing a 400 at the visitor.
  const filters = listingSearchParamsSchema.parse(raw);

  const queryClient = getQueryClient();
  const listings = await queryClient.fetchQuery(
    trpc.catalog.listings.queryOptions({ ...filters, limit: 50 }),
  );

  const isFiltered = Object.values(filters).some(Boolean);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-4">
        <ListingSearch />
        <FilterBar />

        {listings.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 p-12 text-center">
            <PawPrint className="size-10 text-muted-foreground" />
            <p className="font-medium">
              {isFiltered ? "Nenhum pet com esses filtros" : "Nenhum pet disponível ainda"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isFiltered
                ? "Tente ampliar a busca — remover um filtro costuma bastar."
                : "Assim que um abrigo publicar um pet, ele aparece aqui."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {listings.map((listing) => (
              <PetCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </HydrationBoundary>
  );
}
