import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { Dashboard } from "~/components/dashboard.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

export default async function DashboardPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.organization.stats.queryOptions()),
    queryClient.prefetchQuery(trpc.appointment.list.queryOptions({ period: "today", limit: 20 })),
    queryClient.prefetchQuery(trpc.clinical.dueVaccinations.queryOptions({ withinDays: 30 })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Dashboard />
    </HydrationBoundary>
  );
}
