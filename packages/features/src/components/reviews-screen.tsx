"use client";

import { PageHeader } from "./page-header.tsx";
import { ReviewsView } from "./reviews-view.tsx";

/**
 * Avaliações.
 *
 * The subtitle describes both halves of the view — what has been reviewed and
 * what is still waiting — rather than only the first.
 */
export function ReviewsScreen() {
  return (
    <>
      <PageHeader
        title="Avaliações"
        subtitle="O que você avaliou e o que falta avaliar"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <ReviewsView />
      </main>
    </>
  );
}
