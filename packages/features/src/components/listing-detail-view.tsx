"use client";

import { Card, DetailScreenSkeleton } from "@animalesko/ui";
import { useQuery } from "@tanstack/react-query";
import { PawPrint } from "lucide-react";

import { ListingDetail } from "./listing-detail.tsx";
import { useTRPC } from "../trpc.ts";

/**
 * A single listing, fetched on the client.
 *
 * The web app renders `ListingDetail` straight from a server fetch, because it
 * also needs the record to build the OpenGraph tags a shared link previews
 * with. The native bundle has neither a server nor link previews, so it asks
 * for the listing here — and has to handle the not-found case itself, since
 * `notFound()` is a server API.
 */
export function ListingDetailView({ id }: { id: string }) {
  const trpc = useTRPC();
  const listing = useQuery(trpc.catalog.listingById.queryOptions({ id }));

  // Shaped like `ListingDetail`, which opens with a sticky gradient `PageHeader`
  // and a full-bleed photo. The placeholder this replaced had neither, so the
  // header appeared out of nowhere and the photo un-inset itself by 16px a side
  // the moment the data landed — two layout jumps bought by a skeleton meant to
  // prevent one.
  if (listing.isPending) {
    return <DetailScreenSkeleton />;
  }

  if (listing.isError || !listing.data) {
    return (
      <Card className="m-4 flex flex-col items-center gap-3 p-12 text-center">
        <PawPrint className="size-10 text-muted-foreground" />
        <p className="font-medium">Pet não encontrado</p>
        <p className="text-sm text-muted-foreground">
          Esta adoção pode ter sido concluída ou removida.
        </p>
      </Card>
    );
  }

  return <ListingDetail listing={listing.data.listing} siblings={listing.data.siblings} />;
}
