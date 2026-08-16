import { PageHeader } from "@animalesko/features/page-header";
import { MessagesView } from "@animalesko/features/messages-view";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mensagens" };

export default function Page() {
  return (
    <Gated next="/mensagens">
      <PageHeader
        title="Mensagens"
        subtitle="Suas conversas com abrigos e prestadores"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <MessagesView />
      </main>
    </Gated>
  );
}
