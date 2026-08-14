import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { OrganizationPanel } from "~/components/organization-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Organização" };

export default async function OrganizationPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.organization.current.queryOptions()),
    queryClient.prefetchQuery(trpc.organization.verification.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <OrganizationPanel />
    </HydrationBoundary>
  );
}
