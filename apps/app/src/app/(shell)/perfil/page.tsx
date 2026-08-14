import { auth } from "@animalesko/auth";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ProfilePanel } from "~/components/profile-panel.tsx";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  // Gated on the server, so an anonymous visitor is redirected before any
  // markup exists rather than flashing a shell and bouncing.
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    redirect("/entrar?next=/perfil");
  }

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.profile.me.queryOptions()),
    queryClient.prefetchQuery(trpc.gamification.profile.queryOptions({ limit: 5 })),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePanel />
    </HydrationBoundary>
  );
}
