import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { ClientsPanel } from "~/components/clients-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.clientContact.list.queryOptions({ limit: 200 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientsPanel />
    </HydrationBoundary>
  );
}
