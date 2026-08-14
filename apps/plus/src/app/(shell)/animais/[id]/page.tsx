import { TRPCError } from "@trpc/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { notFound } from "next/navigation";

import { AnimalDetail } from "~/components/animal-detail.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const animal = await getQueryClient().fetchQuery(trpc.animal.byId.queryOptions({ id }));
    return { title: animal.name };
  } catch {
    return { title: "Animal não encontrado" };
  }
}

export default async function AnimalPage({ params }: PageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();

  let animal;
  try {
    animal = await queryClient.fetchQuery(trpc.animal.byId.queryOptions({ id }));
  } catch (error) {
    // An animal from another organization reads as missing, which is what the
    // use case's scoping intends.
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  await Promise.all([
    queryClient.prefetchQuery(trpc.clinical.healthRecords.queryOptions({ petId: id })),
    queryClient.prefetchQuery(trpc.clinical.vaccinations.queryOptions({ petId: id })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnimalDetail animal={animal} />
    </HydrationBoundary>
  );
}
