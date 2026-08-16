import { ProfilePanel } from "@animalesko/features/profile-panel";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Perfil" };

export default function ProfilePage() {
  return (
    <Gated next="/perfil">
      <ProfilePanel />
    </Gated>
  );
}
