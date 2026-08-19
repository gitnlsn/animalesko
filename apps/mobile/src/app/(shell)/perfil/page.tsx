import { ProfilePanel } from "@animalesko/features/profile-panel";
import { ProfileSkeleton } from "@animalesko/ui";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

/**
 * The one gated screen that already sits inside chrome.
 *
 * Every other gated route is a `(full)` page that draws its own `PageHeader`,
 * so the gate's default placeholder includes a header-shaped bar. Perfil is in
 * `(shell)`, under the tab layout's `AppHeader`, and taking that default would
 * paint a second gradient bar beneath the real one.
 *
 * `ProfileSkeleton` covers the part of the screen that is still waiting when
 * the gate hands over — avatar, name and the counter row. `ProfilePanel` now
 * mounts its menu and points card immediately and blocks only on the header, so
 * this is a close handoff rather than an identical one; matching it exactly
 * would mean exporting the panel's private header placeholder purely so that a
 * route file could re-render it.
 */
export default function ProfilePage() {
  return (
    <Gated skeleton={<ProfileSkeleton />}>
      <ProfilePanel />
    </Gated>
  );
}
