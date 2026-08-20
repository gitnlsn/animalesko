"use client";

import { PageHeader } from "./page-header.tsx";
import { SupportView } from "./support-view.tsx";
import { useSession } from "../lib/session-context.tsx";

/** Ajuda & suporte — public, so someone deciding whether to sign up can read it. */
export function SupportScreen() {
  const { signedIn } = useSession();

  return (
    <>
      <PageHeader
        title="Ajuda & suporte"
        subtitle="Estamos por aqui 🐾"
        // Public, so the arrow must not lead to a gated route — see
        // `pet-alert-screen.tsx`.
        backTo={signedIn ? "/perfil" : "/"}
      />
      <main className="mx-auto max-w-md p-4">
        <SupportView />
      </main>
    </>
  );
}
