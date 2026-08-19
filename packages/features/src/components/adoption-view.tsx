"use client";

import { listingSearchParamsSchema } from "@animalesko/api/schemas";
import { Card, PetCardSkeleton } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { PawPrint } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useDeferredValue } from "react";

import { FilterBar } from "./filter-bar.tsx";
import { ListingSearch } from "./listing-search.tsx";
import { PetCard } from "./pet-card.tsx";
import { ADOPTION_PAGE_LIMIT } from "../lib/query-inputs.ts";
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

  const listings = useQuery(
    trpc.catalog.listings.queryOptions({ ...filters, limit: ADOPTION_PAGE_LIMIT }),
  );

  /**
   * The feed is up to ADOPTION_PAGE_LIMIT cards, each with an image and its own
   * favourite and share controls, and committing all of them takes long enough
   * to be measurable: two long tasks and ~220ms of blocked main thread on a
   * mid-range device. Blocked means a tap on the tab bar during that window is
   * queued rather than handled, which is the "nothing happened" feeling.
   *
   * Deferring the data moves that commit into a background render React can
   * interrupt for input. The second argument is what makes it work on the first
   * paint too — without it the initial render has no previous value to fall
   * back to and blocks exactly as before. While the two differ we are still
   * rendering, so the placeholder stays up and the transition reads as loading
   * rather than freezing.
   */
  const settled = useDeferredValue(listings.data, undefined);
  const rendering = settled !== listings.data;

  return (
    <div className="space-y-4">
      <ListingSearch />
      <FilterBar />

      {listings.isPending || rendering ? (
        // `PetCardSkeleton` rather than a flat block: it carries the card's own
        // photo/detail split, so the arriving cards fill the space they are
        // already occupying instead of replacing a differently shaped one.
        <div className="space-y-4">
          <PetCardSkeleton />
          <PetCardSkeleton />
          <PetCardSkeleton />
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
          {settled?.map((listing) => (
            <PetCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
