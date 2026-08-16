import { PageHeader } from "@animalesko/features/page-header";
import { FavoritesList } from "@animalesko/features/favorites-list";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Meus favoritos" };

export default function Page() {
  return (
    <Gated next="/favoritos">
      <PageHeader
        title="Meus favoritos"
        subtitle="Pets e serviços que você guardou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <FavoritesList />
      </main>
    </Gated>
  );
}
