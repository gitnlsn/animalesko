"use client";

import { Suspense } from "react";

import { PageHeader } from "./page-header.tsx";
import { PetAlertBoard } from "./pet-alert-board.tsx";
import { useSession } from "../lib/session-context.tsx";

/**
 * Pet Alert — public on purpose.
 *
 * A lost animal is found by whoever happens to walk past it, and demanding an
 * account before showing the board would defeat the feature. Filing an alert or
 * reporting a sighting still needs a session, handled inside the board.
 */
export function PetAlertScreen() {
  const { signedIn } = useSession();

  return (
    <>
      <PageHeader
        title="Pet Alert"
        subtitle="Ajude a encontrar quem está perdido"
        // The page is public, so the back arrow cannot assume `/perfil`: for a
        // visitor who arrived from a shared link or a search result that is a
        // gated route, and "back" would answer with a login form. Signed in,
        // `/perfil` is still where the link into here lives.
        backTo={signedIn ? "/perfil" : "/"}
      />
      <main className="mx-auto max-w-md p-4">
        {/* The board reads `?alerta=` to open a notified alert, and
            `useSearchParams` has to prerender inside a boundary for the static
            export the native bundle is built from. */}
        <Suspense fallback={<div className="min-h-[50dvh]" />}>
          <PetAlertBoard />
        </Suspense>
      </main>
    </>
  );
}
