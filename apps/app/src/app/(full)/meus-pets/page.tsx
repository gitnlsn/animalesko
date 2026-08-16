import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { MyPets } from "@animalesko/features/my-pets";
import { PageHeader } from "@animalesko/features/page-header";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus Pets" };

export default async function MyPetsPage() {
  const session = await requireSession("/meus-pets");

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.pet.list.queryOptions({ includeDeceased: false, limit: 50 })),
    queryClient.prefetchQuery(trpc.pet.quota.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader
        title="Meus pets"
        subtitle={`Olá, ${session.user.name.split(" ")[0]}`}
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MyPets />
      </main>
    </HydrationBoundary>
  );
}
