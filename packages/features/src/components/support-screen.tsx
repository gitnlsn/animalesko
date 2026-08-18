"use client";

import { PageHeader } from "./page-header.tsx";
import { SupportView } from "./support-view.tsx";

/** Ajuda & suporte — public, so someone deciding whether to sign up can read it. */
export function SupportScreen() {
  return (
    <>
      <PageHeader title="Ajuda & suporte" subtitle="Estamos por aqui 🐾" backTo="/perfil" />
      <main className="mx-auto max-w-md p-4">
        <SupportView />
      </main>
    </>
  );
}
