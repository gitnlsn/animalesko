"use client";

import { MyPets } from "./my-pets.tsx";
import { PageHeader } from "./page-header.tsx";
import { useSession } from "../lib/session-context.tsx";

/**
 * Meus pets — the one gated screen whose header depends on *who* is signed in,
 * so it reads the session rather than just being fenced by it.
 *
 * The name is optional because the native bundle resolves the session
 * asynchronously; on the web the server gate guarantees it, so the fallback
 * never renders there.
 */
export function MyPetsScreen() {
  const { name } = useSession();

  return (
    <>
      <PageHeader
        title="Meus pets"
        subtitle={name ? `Olá, ${name.split(" ")[0]}` : "Os animais que você cadastrou"}
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MyPets />
      </main>
    </>
  );
}
