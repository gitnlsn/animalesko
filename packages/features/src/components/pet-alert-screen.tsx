"use client";

import { PageHeader } from "./page-header.tsx";
import { PetAlertBoard } from "./pet-alert-board.tsx";

/**
 * Pet Alert — public on purpose.
 *
 * A lost animal is found by whoever happens to walk past it, and demanding an
 * account before showing the board would defeat the feature. Filing an alert or
 * reporting a sighting still needs a session, handled inside the board.
 */
export function PetAlertScreen() {
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
