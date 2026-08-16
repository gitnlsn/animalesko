import { PageHeader } from "@animalesko/features/page-header";
import { SupportView } from "@animalesko/features/support-view";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ajuda & Suporte" };

/** Public: someone deciding whether to sign up should be able to read the FAQ. */
export default function SupportPage() {
  return (
    <>
      <PageHeader title="Ajuda & suporte" subtitle="Estamos por aqui 🐾" backTo="/perfil" />
      <main className="mx-auto max-w-md p-4">
        <SupportView />
      </main>
    </>
  );
}
