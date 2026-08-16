"use client";

import { listingSearchParamsSchema } from "@animalesko/api/schemas";
import { Card, Skeleton } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { PawPrint } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { FilterBar } from "./filter-bar.tsx";
import { ListingSearch } from "./listing-search.tsx";
import { PetCard } from "./pet-card.tsx";
import { useTRPC } from "../trpc.ts";

/**
 * Adoção — the prototype's `adoption` tab.
 *
 * Filters live in the URL on both hosts, which is what keeps a filtered feed
 * shareable on the web and what lets the back button undo a filter in the app.
 * The web page parses them on the server and prefetches; here the same schema
 * parses them from `useSearchParams`, so a hand-edited URL still degrades to
 * the unfiltered feed rather than throwing.
 */
export function AdoptionView() {
  const trpc = useTRPC();
  const searchParams = useSearchParams();

  const filters = listingSearchParamsSchema.parse(Object.fromEntries(searchParams.entries()));
  const isFiltered = Object.values(filters).some(Boolean);

  const listings = useQuery(trpc.catalog.listings.queryOptions({ ...filters, limit: 50 }));

  return (
    <div className="space-y-4">
      <ListingSearch />
      <FilterBar />

      {listings.isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      ) : (listings.data?.length ?? 0) === 0 ? (
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
          {listings.data?.map((listing) => (
            <PetCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
