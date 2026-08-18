import { FavoritesScreen } from "@animalesko/features/favorites-screen";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus favoritos" };

export default function Page() {
  return (
    <Gated next="/favoritos">
      <FavoritesScreen />
    </Gated>
  );
}
