import { PageHeader } from "~/components/page-header.tsx";
import { SupportView } from "~/components/support-view.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ajuda & Suporte",
  description: "Dúvidas frequentes sobre adoção, serviços e Pet Alert na Animalesko.",
};

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
