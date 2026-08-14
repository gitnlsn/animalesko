import { agendaSearchParamsSchema } from "@animalesko/api/schemas";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { Agenda } from "~/components/agenda.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Parsed leniently: a hand-edited URL degrades to the unfiltered agenda
  // rather than 400-ing the page.
  const filters = agendaSearchParamsSchema.parse(await searchParams);

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.appointment.list.queryOptions({ ...filters, limit: 200 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Agenda {...filters} />
    </HydrationBoundary>
  );
}
