"use client";

import { useSession } from "@animalesko/features";
import { MyPets } from "@animalesko/features/my-pets";
import { PageHeader } from "@animalesko/features/page-header";

import { Gated } from "~/components/gated.tsx";

/**
 * The one gated screen whose header depends on *who* is signed in, so unlike
 * its siblings it reads the session rather than just being fenced by it. A
 * client component throughout — `metadata` is a server export and cannot come
 * along, which costs nothing inside a WebView.
 */
export default function MyPetsPage() {
  const { name } = useSession();

  return (
    <Gated next="/meus-pets">
      <PageHeader
        title="Meus pets"
        subtitle={name ? `Olá, ${name.split(" ")[0]}` : "Os animais que você cadastrou"}
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MyPets />
      </main>
    </Gated>
  );
}
