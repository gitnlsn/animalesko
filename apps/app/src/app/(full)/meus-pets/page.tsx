import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { MyPetsScreen } from "@animalesko/features/my-pets-screen";
import { MY_PETS_LIST_INPUT } from "@animalesko/features/query-inputs";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus Pets" };

export default async function MyPetsPage() {
  // The greeting in the header comes from the session context that the (full)
  // layout provides, so the gate is all this needs from the session itself.
  await requireSession("/meus-pets");

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.pet.list.queryOptions(MY_PETS_LIST_INPUT)),
    queryClient.prefetchQuery(trpc.pet.quota.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyPetsScreen />
    </HydrationBoundary>
  );
}
