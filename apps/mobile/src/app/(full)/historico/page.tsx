import { PageHeader } from "@animalesko/features/page-header";
import { ServiceHistory } from "@animalesko/features/service-history";

import { Gated } from "~/components/gated.tsx";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Histórico de serviços" };

export default function Page() {
  return (
    <Gated next="/historico">
      <PageHeader
        title="Histórico de serviços"
        subtitle="Tudo que você já agendou"
        backTo="/perfil"
      />
      <main className="mx-auto max-w-md p-4">
        <ServiceHistory />
      </main>
    </Gated>
  );
}
