import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { HistoryScreen } from "@animalesko/features/history-screen";
import { HISTORY_BOOKINGS_LIMIT } from "@animalesko/features/query-inputs";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de Serviços" };

export default async function ServiceHistoryPage() {
  await requireSession("/historico");

  const queryClient = getQueryClient();

  // Only the "Todos" tab is prefetched; the other three filter on demand.
  await queryClient.prefetchQuery(
    trpc.booking.list.queryOptions({ limit: HISTORY_BOOKINGS_LIMIT }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HistoryScreen />
    </HydrationBoundary>
  );
}
