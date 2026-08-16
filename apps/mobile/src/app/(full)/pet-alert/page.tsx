import { PageHeader } from "@animalesko/features/page-header";
import { PetAlertBoard } from "@animalesko/features/pet-alert-board";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Pet Alert" };

/**
 * Public on purpose: a lost animal is found by whoever happens to walk past it.
 * Filing an alert or reporting a sighting still needs a session, handled inside
 * the board.
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
