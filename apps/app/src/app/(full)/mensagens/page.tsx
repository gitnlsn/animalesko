import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { MessagesView } from "~/components/messages-view.tsx";
import { PageHeader } from "~/components/page-header.tsx";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  await requireSession("/mensagens");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.message.conversations.queryOptions({ limit: 30 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageHeader
        title="Mensagens"
        subtitle="Suas conversas com abrigos e prestadores"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MessagesView />
      </main>
    </HydrationBoundary>
  );
}
