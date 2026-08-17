import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { ReviewsScreen } from "@animalesko/features/reviews-screen";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avaliações" };

export default async function ReviewsPage() {
  await requireSession("/avaliacoes");

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.review.pending.queryOptions()),
    queryClient.prefetchQuery(trpc.review.mine.queryOptions()),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReviewsScreen />
    </HydrationBoundary>
  );
}
