import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { NotificationsPanel } from "~/components/notifications-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(
    trpc.notification.list.queryOptions({ onlyUnread: false, limit: 50 }),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotificationsPanel />
    </HydrationBoundary>
  );
}
