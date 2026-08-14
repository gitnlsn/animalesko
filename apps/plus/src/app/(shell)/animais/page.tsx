import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { AnimalsPanel } from "~/components/animals-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Animais" };

export default async function AnimalsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.animal.list.queryOptions({ limit: 200 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AnimalsPanel />
    </HydrationBoundary>
  );
}
