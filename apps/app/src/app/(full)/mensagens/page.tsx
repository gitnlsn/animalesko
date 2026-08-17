import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { MessagesView } from "@animalesko/features/messages-view";
import { PageHeader } from "@animalesko/features/page-header";
import { MESSAGES_CONVERSATIONS_INPUT } from "@animalesko/features/query-inputs";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mensagens" };

export default async function MessagesPage() {
  await requireSession("/mensagens");

  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.message.conversations.queryOptions(MESSAGES_CONVERSATIONS_INPUT),
  );

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
