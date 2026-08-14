import { PageHeader } from "~/components/page-header.tsx";
import { PetAlertBoard } from "~/components/pet-alert-board.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pet Alert",
  description: "Pets perdidos e encontrados perto de você.",
};

/**
 * Public on purpose: a lost animal is found by whoever happens to walk past it,
 * and demanding an account before showing the board would defeat the feature.
 * Filing an alert or reporting a sighting still needs a session, handled inside
 * the board.
 *
 * Nothing is prefetched — the query depends on the visitor's coordinates, which
 * only the browser knows.
 */
export default function PetAlertPage() {
  return (
    <>
      <PageHeader
        title="Pet Alert"
        subtitle="Ajude a encontrar quem está perdido"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <PetAlertBoard />
      </main>
    </>
  );
}
