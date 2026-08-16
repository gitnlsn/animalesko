import { PageHeader } from "@animalesko/features/page-header";
import { ReviewsView } from "@animalesko/features/reviews-view";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Avaliações" };

export default function Page() {
  return (
    <Gated next="/avaliacoes">
      <PageHeader
        title="Avaliações"
        subtitle="O que você avaliou e o que falta avaliar"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <ReviewsView />
      </main>
    </Gated>
  );
}
