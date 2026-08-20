import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

import { ProfilePanel } from "@animalesko/features/profile-panel";
import { GAMIFICATION_PROFILE_INPUT } from "@animalesko/features/query-inputs";
import { requireSession } from "~/lib/require-session.ts";
import { getQueryClient, trpc } from "~/trpc/server.ts";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  // Gated on the server, so an anonymous visitor is redirected before any
  // markup exists rather than flashing a shell and bouncing. Through
  // `requireSession` like every other gate: the hand-rolled copy this replaced
  // built its `?next=` without encoding it.
  await requireSession("/perfil");

  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.profile.me.queryOptions()),
    queryClient.prefetchQuery(trpc.gamification.profile.queryOptions(GAMIFICATION_PROFILE_INPUT)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProfilePanel />
    </HydrationBoundary>
  );
}
