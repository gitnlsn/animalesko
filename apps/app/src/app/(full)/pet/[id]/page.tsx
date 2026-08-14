import { TRPCError } from "@trpc/server";
import { notFound } from "next/navigation";

import { ListingDetail } from "~/components/listing-detail.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Real metadata for a shared link.
 *
 * The prototype's share button copied a URL that opened a client-side shell,
 * so every pet previewed identically in WhatsApp. This makes the preview the
 * animal.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const { listing } = await getQueryClient().fetchQuery(
      trpc.catalog.listingById.queryOptions({ id }),
    );

    return {
      title: `${listing.pet.name} para adoção`,
      description: listing.summary,
      openGraph: {
        title: `Conheça ${listing.pet.name} — Animalesko`,
        description: listing.summary,
        images: listing.photos[0]?.url ? [listing.photos[0].url] : undefined,
      },
    };
  } catch {
    return { title: "Pet não encontrado" };
  }
}

export default async function PetDetailsPage({ params }: PageProps) {
  const { id } = await params;

  const queryClient = getQueryClient();

  // The use case throws NOT_FOUND for a draft, archived or unknown listing;
  // that has to become a real 404 rather than an error boundary.
  let result;
  try {
    result = await queryClient.fetchQuery(trpc.catalog.listingById.queryOptions({ id }));
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  return <ListingDetail listing={result.listing} siblings={result.siblings} />;
}
