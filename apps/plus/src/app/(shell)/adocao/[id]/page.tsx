import { TRPCError } from "@trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { ListingDetail } from "~/components/listing-detail.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const listing = await getQueryClient().fetchQuery(trpc.listing.byId.queryOptions({ id }));
    return { title: `Anúncio de ${listing.pet.name}` };
  } catch {
    return { title: "Anúncio não encontrado" };
  }
}

export default async function ListingPage({ params }: PageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();

  let listing;
  try {
    listing = await queryClient.fetchQuery(trpc.listing.byId.queryOptions({ id }));
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  await queryClient.prefetchQuery(trpc.listing.applications.queryOptions({ listingId: id }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ListingDetail listing={listing} />
    </HydrationBoundary>
  );
}
