"use client";

import { FavoritesList } from "./favorites-list.tsx";
import { PageHeader } from "./page-header.tsx";

/** Meus favoritos — saved listings and offerings, in two tabs. */
export function FavoritesScreen() {
  return (
    <>
      <PageHeader
        title="Meus favoritos"
        subtitle="Pets e serviços que você guardou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <FavoritesList />
      </main>
    </>
  );
}
